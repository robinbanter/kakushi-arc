// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IVerifier} from "../interfaces/IVerifier.sol";
import {IERC20Min} from "../interfaces/IERC20Min.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {SafeTransfer} from "../lib/SafeTransfer.sol";
import {Errors} from "../lib/Errors.sol";
import {Poseidon2} from "../lib/Poseidon2.sol";
import {PoolZeros} from "./PoolZeros.sol";

/// @notice Fixed-denomination shielded USDC pool for Arc (Tornado / Privacy Pools style). One instance per
///         denomination; the asset is an ERC-20 (USDC at 0x3600..0000 on Arc, 6 decimals). There is NO native-coin
///         mode: on Arc the native coin IS USDC (18-dec accounting), so a coin pool would double-count decimals.
///
///         Note    : (nullifier, secret), random BN254 field elements
///         Leaf    : commitment    = Poseidon2::hash([nullifier, secret], 2)
///         Spend   : nullifierHash = Poseidon2::hash([nullifier], 1)
///         Tree    : incremental, depth 20, node = Poseidon2::hash([left, right], 2), empty leaf
///                   PoolZeros.ZERO_VALUE; the last 64 roots are accepted.
///         Proof   : packages/zk/circuits/shielded_withdraw (UltraHonk, keccak transcript, ZK) with
///                   public inputs, as bytes32 field elements in this order:
///                   [root, nullifierHash, uint160(recipient), uint160(relayer), fee, refund = 0,
///                    block.chainid, uint160(address(this)), extDataHash = 0]
///                   so a proof is bound to one recipient/relayer/fee, one chain and one pool.
///                   (refund and extDataHash are kept in the circuit for source compatibility and fixed to 0 here.)
///
///         Guard rails for the beta: no owner, no upgrade, no pause, no fee to the pool. `maxDeposits` bounds how many
///         notes the pool will ever accept (immutable, set at deployment), which bounds the value at risk.
contract KakushiPool is ReentrancyGuard {
    using SafeTransfer for address;

    uint256 public constant FIELD_SIZE = Poseidon2.P;
    uint256 public constant LEVELS = 20; // == PoolZeros.DEPTH (asserted in the constructor)
    uint256 public constant ROOT_HISTORY_SIZE = 64;

    IVerifier public immutable verifier;
    /// the pool asset: USDC on Arc (6 decimals)
    address public immutable token;
    /// base units of `token` (USDC: 10e6 = 10 USDC)
    uint256 public immutable denomination;
    /// total deposits the pool accepts, ever (<= 2**LEVELS)
    uint32 public immutable maxDeposits;

    uint256[LEVELS] public filledSubtrees;
    bytes32[ROOT_HISTORY_SIZE] public roots;
    uint32 public currentRootIndex;
    uint32 public nextIndex;

    mapping(bytes32 => bool) public commitments;
    mapping(bytes32 => bool) public nullifierHashes;

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address to, bytes32 nullifierHash, address indexed relayer, uint256 fee);

    constructor(IVerifier verifier_, address token_, uint256 denomination_, uint32 maxDeposits_) {
        if (address(verifier_) == address(0) || token_ == address(0)) revert Errors.ZeroAddress();
        if (denomination_ == 0 || denomination_ >= 2 ** 128) revert Errors.InvalidParams();
        if (token_.code.length == 0) revert Errors.InvalidParams();
        if (maxDeposits_ == 0 || maxDeposits_ > uint32(1) << uint32(LEVELS)) revert Errors.InvalidParams();
        assert(LEVELS == PoolZeros.DEPTH);
        verifier = verifier_;
        token = token_;
        denomination = denomination_;
        maxDeposits = maxDeposits_;
        for (uint256 i; i < LEVELS; i++) {
            filledSubtrees[i] = PoolZeros.zeros(i);
        }
        roots[0] = bytes32(PoolZeros.zeros(LEVELS));
    }

    // ------------------------------------------------------------------ deposit

    /// @notice Shield exactly `denomination` of `token` (transferFrom with prior approval) behind `commitment`.
    function deposit(bytes32 commitment) external nonReentrant {
        if (uint256(commitment) >= FIELD_SIZE) revert Errors.NotAFieldElement();
        if (commitments[commitment]) revert Errors.CommitmentExists(commitment);
        if (nextIndex >= maxDeposits) revert Errors.TreeFull();
        commitments[commitment] = true;
        uint32 leafIndex = _insert(uint256(commitment));

        uint256 before = IERC20Min(token).balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), denomination);
        uint256 received = IERC20Min(token).balanceOf(address(this)) - before;
        if (received != denomination) revert Errors.WrongValue(received, denomination);
        emit Deposit(commitment, leafIndex, block.timestamp);
    }

    // ------------------------------------------------------------------ withdraw

    /// @notice Spend a note: pays `denomination - fee` to `recipient` and `fee` to `relayer` (both in `token`).
    ///         The fee is part of the proof, so a relayer cannot raise it; with fee == 0 and relayer == 0 anyone
    ///         (including the note holder) may submit.
    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifierHash,
        address recipient,
        address relayer,
        uint256 fee
    ) external nonReentrant {
        if (fee > denomination) revert Errors.FeeTooHigh(fee, denomination);
        if (recipient == address(0) || (fee > 0 && relayer == address(0))) revert Errors.InvalidRecipient();
        if (uint256(nullifierHash) >= FIELD_SIZE) revert Errors.NotAFieldElement();
        if (nullifierHashes[nullifierHash]) revert Errors.NullifierSpent(nullifierHash);
        if (!isKnownRoot(root)) revert Errors.UnknownRoot(root);

        // the bb verifiers revert (rather than return false) on most failures: normalise both
        try verifier.verify(proof, _publicInputs(root, nullifierHash, recipient, relayer, fee)) returns (bool ok) {
            if (!ok) revert Errors.InvalidProof();
        } catch {
            revert Errors.InvalidProof();
        }
        nullifierHashes[nullifierHash] = true;

        token.safeTransfer(recipient, denomination - fee);
        if (fee > 0) token.safeTransfer(relayer, fee);
        emit Withdrawal(recipient, nullifierHash, relayer, fee);
    }

    /// @notice The verifier's public inputs for a withdrawal from this pool on this chain.
    function publicInputs(bytes32 root, bytes32 nullifierHash, address recipient, address relayer, uint256 fee)
        external
        view
        returns (bytes32[] memory)
    {
        return _publicInputs(root, nullifierHash, recipient, relayer, fee);
    }

    function _publicInputs(bytes32 root, bytes32 nullifierHash, address recipient, address relayer, uint256 fee)
        internal
        view
        returns (bytes32[] memory pi)
    {
        pi = new bytes32[](9);
        pi[0] = root;
        pi[1] = nullifierHash;
        pi[2] = bytes32(uint256(uint160(recipient)));
        pi[3] = bytes32(uint256(uint160(relayer)));
        pi[4] = bytes32(fee);
        pi[5] = bytes32(0); // refund (unused on Arc: the recipient pays gas in the USDC it just received)
        pi[6] = bytes32(block.chainid);
        pi[7] = bytes32(uint256(uint160(address(this))));
        pi[8] = bytes32(0); // extDataHash (private calls are not part of the Arc port)
    }

    // ------------------------------------------------------------------ tree

    function _insert(uint256 leaf) internal returns (uint32 index) {
        uint32 next = nextIndex;
        uint256 cur = leaf;
        uint256 idx = next;
        for (uint256 i; i < LEVELS; i++) {
            if (idx & 1 == 0) {
                filledSubtrees[i] = cur;
                cur = Poseidon2.hash2(cur, PoolZeros.zeros(i));
            } else {
                cur = Poseidon2.hash2(filledSubtrees[i], cur);
            }
            idx >>= 1;
        }
        uint32 newRootIndex = uint32((currentRootIndex + 1) % ROOT_HISTORY_SIZE);
        currentRootIndex = newRootIndex;
        roots[newRootIndex] = bytes32(cur);
        nextIndex = next + 1;
        return next;
    }

    /// @notice True if `root` is one of the last ROOT_HISTORY_SIZE roots of this pool.
    function isKnownRoot(bytes32 root) public view returns (bool) {
        if (root == bytes32(0)) return false;
        uint256 i = currentRootIndex;
        for (uint256 n; n < ROOT_HISTORY_SIZE; n++) {
            if (roots[i] == root) return true;
            i = i == 0 ? ROOT_HISTORY_SIZE - 1 : i - 1;
        }
        return false;
    }

    function getLastRoot() external view returns (bytes32) {
        return roots[currentRootIndex];
    }

    function isSpent(bytes32 nullifierHash) external view returns (bool) {
        return nullifierHashes[nullifierHash];
    }
}
