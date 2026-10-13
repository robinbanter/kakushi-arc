// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {KakushiPool} from "../../src/privacy/KakushiPool.sol";
import {PoolZeros} from "../../src/privacy/PoolZeros.sol";
import {IVerifier} from "../../src/interfaces/IVerifier.sol";
import {Errors} from "../../src/lib/Errors.sol";
import {Poseidon2} from "../../src/lib/Poseidon2.sol";
import {ShieldedWithdrawVerifier} from "../../src/verifiers/ShieldedWithdrawVerifier.sol";
import {ReentrantToken, ToggleVerifier} from "../utils/TestToken.sol";
import {CircleUSDC, IFiatToken} from "../utils/CircleUSDC.sol";

/// @notice KakushiPool on Arc's USDC (Circle FiatToken v2.2 at 0x3600...0000, 6 decimals) with REAL
///         Noir/UltraHonk proofs (packages/prover/scripts/pool-ffi.ts builds the off-chain tree and proves with
///         bb.js) verified by ShieldedWithdrawVerifier.
contract KakushiPoolTest is Test {
    uint256 constant P = Poseidon2.P;
    uint64 constant ARC_TESTNET = 5042002;
    uint64 constant ARC_MAINNET = 5042;
    uint32 constant CAP = 1000;

    IVerifier verifier;
    IFiatToken usdc;
    KakushiPool pool; // 100 USDC

    address alice = makeAddr("alice");
    address bob = makeAddr("bob");
    address carol = makeAddr("carol");
    address recipient = makeAddr("fresh-recipient");
    address relayer = makeAddr("relayer");

    event Deposit(bytes32 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event Withdrawal(address to, bytes32 nullifierHash, address indexed relayer, uint256 fee);

    function setUp() public {
        vm.chainId(ARC_TESTNET);
        vm.warp(1_800_000_000);
        usdc = CircleUSDC.deploy();
        verifier = IVerifier(address(new ShieldedWithdrawVerifier()));
        pool = new KakushiPool(verifier, address(usdc), 100e6, CAP);
        _fund(alice, pool);
        _fund(bob, pool);
        _fund(carol, pool);
    }

    // ------------------------------------------------------------------ helpers

    function _fund(address who, KakushiPool p) internal {
        CircleUSDC.mint(who, 1_000e6);
        vm.prank(who);
        usdc.approve(address(p), type(uint256).max);
    }

    function _note(string memory label) internal pure returns (uint256 nullifier, uint256 secret, bytes32 commitment) {
        nullifier = uint256(keccak256(abi.encode(label, "nullifier"))) % P;
        secret = uint256(keccak256(abi.encode(label, "secret"))) % P;
        commitment = bytes32(Poseidon2.hash2(nullifier, secret));
    }

    function _deposit(KakushiPool p, address from, bytes32 commitment) internal returns (uint256 gasUsed) {
        vm.startPrank(from);
        uint256 g = gasleft();
        p.deposit(commitment);
        gasUsed = g - gasleft();
        vm.stopPrank();
    }

    /// alice, bob (the note we spend) and carol deposit; returns the leaves in order
    function _threeDeposits(KakushiPool p) internal returns (bytes32[] memory leaves) {
        leaves = new bytes32[](3);
        (,, leaves[0]) = _note("alice");
        (,, leaves[1]) = _note("bob");
        (,, leaves[2]) = _note("carol");
        _deposit(p, alice, leaves[0]);
        _deposit(p, bob, leaves[1]);
        _deposit(p, carol, leaves[2]);
    }

    function _leavesJson(bytes32[] memory leaves) internal pure returns (string memory s) {
        s = "[";
        for (uint256 i; i < leaves.length; i++) {
            s = string.concat(s, i == 0 ? '"' : ',"', vm.toString(uint256(leaves[i])), '"');
        }
        s = string.concat(s, "]");
    }

    function _ffi(string memory json) internal returns (bytes memory) {
        string[] memory cmd = new string[](3);
        cmd[0] = "node";
        cmd[1] = "../prover/scripts/pool-ffi.ts";
        cmd[2] = json;
        return vm.ffi(cmd);
    }

    struct W {
        bytes32 root;
        bytes32 nullifierHash;
        bytes proof;
        address recipient;
        address relayer;
        uint256 fee;
    }

    /// REAL proof for `label`'s note against the off-chain tree of `leaves`, bound to this chain and `p`.
    function _prove(KakushiPool p, bytes32[] memory leaves, string memory label, uint256 fee)
        internal
        returns (W memory w)
    {
        (uint256 nullifier, uint256 secret,) = _note(label);
        string memory json = string.concat(
            '{"mode":"prove","leaves":',
            _leavesJson(leaves),
            ',"nullifier":"',
            vm.toString(nullifier),
            '","secret":"',
            vm.toString(secret),
            '","recipient":"',
            vm.toString(recipient),
            '","relayer":"',
            vm.toString(relayer)
        );
        json = string.concat(
            json,
            '","fee":"',
            vm.toString(fee),
            '","chainId":"',
            vm.toString(block.chainid),
            '","pool":"',
            vm.toString(address(p)),
            '"}'
        );
        bytes32[] memory pis;
        (w.root, w.nullifierHash, w.proof, pis) = abi.decode(_ffi(json), (bytes32, bytes32, bytes, bytes32[]));
        assertGt(w.proof.length, 0, "proof generated");
        w.recipient = recipient;
        w.relayer = relayer;
        w.fee = fee;
        // the prover's public inputs are exactly what the pool feeds the verifier
        bytes32[] memory expected = p.publicInputs(w.root, w.nullifierHash, recipient, relayer, fee);
        assertEq(pis.length, expected.length, "public input count");
        for (uint256 i; i < pis.length; i++) assertEq(pis[i], expected[i], "public input encoding");
        assertEq(w.nullifierHash, bytes32(Poseidon2.hash1(nullifier)), "nullifierHash = Poseidon2(nullifier)");
    }

    /// submitted by this contract, as the relayer's transaction would be (msg.sender is irrelevant to the proof)
    function _withdraw(KakushiPool p, W memory w) internal returns (uint256 gasUsed) {
        uint256 g = gasleft();
        p.withdraw(w.proof, w.root, w.nullifierHash, w.recipient, w.relayer, w.fee);
        gasUsed = g - gasleft();
    }

    function _expectWithdrawRevert(KakushiPool p, W memory w, bytes memory err) internal {
        vm.expectRevert(err);
        p.withdraw(w.proof, w.root, w.nullifierHash, w.recipient, w.relayer, w.fee);
    }

    // ------------------------------------------------------------------ real-proof tests

    function test_UsdcDepositWithdrawWithRealProof() public {
        bytes32[] memory leaves = _threeDeposits(pool);
        assertEq(usdc.balanceOf(address(pool)), 300e6);

        W memory w = _prove(pool, leaves, "bob", 1e6);
        assertEq(w.root, pool.getLastRoot(), "off-chain root == on-chain root");

        vm.expectEmit(address(pool));
        emit Withdrawal(recipient, w.nullifierHash, relayer, 1e6);
        uint256 gasW = _withdraw(pool, w);

        assertEq(usdc.balanceOf(recipient), 99e6, "recipient gets denomination - fee");
        assertEq(usdc.balanceOf(relayer), 1e6, "relayer gets the fee in USDC");
        assertEq(usdc.balanceOf(address(pool)), 200e6);
        assertTrue(pool.isSpent(w.nullifierHash));
        console2.log("withdraw gas (USDC, real proof)", gasW);

        // double spend: same proof, and the nullifier is burnt for any other proof too
        _expectWithdrawRevert(pool, w, abi.encodeWithSelector(Errors.NullifierSpent.selector, w.nullifierHash));
    }

    /// One real proof; every public input it binds is tampered with in turn, then the honest call succeeds.
    function test_ProofIsBoundToRootRecipientRelayerFeeChainAndPool() public {
        bytes32[] memory leaves = _threeDeposits(pool);
        W memory w = _prove(pool, leaves, "bob", 5e6);
        bytes memory invalid = abi.encodeWithSelector(Errors.InvalidProof.selector);

        W memory t = _copy(w);
        t.recipient = makeAddr("front-runner");
        _expectWithdrawRevert(pool, t, invalid);

        t = _copy(w);
        t.relayer = makeAddr("other-relayer");
        _expectWithdrawRevert(pool, t, invalid);

        t = _copy(w);
        t.fee = 50e6;
        _expectWithdrawRevert(pool, t, invalid);

        t = _copy(w);
        (uint256 otherNullifier,,) = _note("alice");
        t.nullifierHash = bytes32(Poseidon2.hash1(otherNullifier));
        _expectWithdrawRevert(pool, t, invalid);

        // a later root is also known, but the proof is for the earlier one
        (,, bytes32 dave) = _note("dave");
        _deposit(pool, alice, dave);
        assertTrue(pool.isKnownRoot(w.root) && pool.isKnownRoot(pool.getLastRoot()));
        t = _copy(w);
        t.root = pool.getLastRoot();
        _expectWithdrawRevert(pool, t, invalid);

        t = _copy(w);
        t.root = bytes32(uint256(123));
        _expectWithdrawRevert(pool, t, abi.encodeWithSelector(Errors.UnknownRoot.selector, t.root));

        // same pool address, other chain (a fork / replay on another network, e.g. testnet -> mainnet)
        vm.chainId(ARC_MAINNET);
        _expectWithdrawRevert(pool, w, invalid);
        vm.chainId(ARC_TESTNET);

        // other pool, same deposits, same root
        KakushiPool twin = new KakushiPool(verifier, address(usdc), 100e6, CAP);
        _fund(alice, twin);
        _fund(bob, twin);
        _fund(carol, twin);
        _deposit(twin, alice, leaves[0]);
        _deposit(twin, bob, leaves[1]);
        _deposit(twin, carol, leaves[2]);
        assertTrue(twin.isKnownRoot(w.root), "twin has the same root");
        _expectWithdrawRevert(twin, w, invalid);

        // the honest withdrawal still works
        _withdraw(pool, w);
        assertEq(usdc.balanceOf(recipient), 95e6);
        assertEq(usdc.balanceOf(relayer), 5e6);
    }

    function _copy(W memory w) internal pure returns (W memory c) {
        c = W(w.root, w.nullifierHash, w.proof, w.recipient, w.relayer, w.fee);
    }

    // ------------------------------------------------------------------ tree

    function test_TreeRootsMatchOffChainReference() public {
        KakushiPool p = new KakushiPool(IVerifier(address(new ToggleVerifier())), address(usdc), 1e6, CAP);
        _fund(alice, p);
        assertEq(p.getLastRoot(), bytes32(PoolZeros.zeros(20)), "empty root");
        uint256 n = 13;
        bytes32[] memory leaves = new bytes32[](n);
        bytes32[] memory onchain = new bytes32[](n);
        uint256 maxGas;
        uint256 minGas = type(uint256).max;
        for (uint256 i; i < n; i++) {
            leaves[i] = bytes32(uint256(keccak256(abi.encode("leaf", i))) % P);
            vm.expectEmit(address(p));
            emit Deposit(leaves[i], uint32(i), block.timestamp);
            uint256 g = _deposit(p, alice, leaves[i]);
            if (g > maxGas) maxGas = g;
            if (g < minGas) minGas = g;
            onchain[i] = p.getLastRoot();
        }
        uint256[] memory ref =
            abi.decode(_ffi(string.concat('{"mode":"tree","leaves":', _leavesJson(leaves), "}")), (uint256[]));
        assertEq(ref.length, n);
        for (uint256 i; i < n; i++) {
            assertEq(uint256(onchain[i]), ref[i], "root after insert");
            assertTrue(p.isKnownRoot(onchain[i]));
        }
        assertEq(p.nextIndex(), n);
        console2.log("deposit gas (USDC) min", minGas);
        console2.log("deposit gas (USDC) max", maxGas);
    }

    function test_RootHistoryKeepsLast64() public {
        KakushiPool p = new KakushiPool(IVerifier(address(new ToggleVerifier())), address(usdc), 1e6, CAP);
        _fund(alice, p);
        bytes32 empty = p.getLastRoot();
        _deposit(p, alice, bytes32(uint256(1)));
        bytes32 first = p.getLastRoot();
        for (uint256 i = 2; i <= 63; i++) _deposit(p, alice, bytes32(i));
        // 63 roots recorded after the empty one: nothing overwritten yet
        assertTrue(p.isKnownRoot(first));
        assertTrue(p.isKnownRoot(empty));
        _deposit(p, alice, bytes32(uint256(64)));
        assertFalse(p.isKnownRoot(empty));
        assertTrue(p.isKnownRoot(first));
        _deposit(p, alice, bytes32(uint256(65)));
        assertFalse(p.isKnownRoot(first));
        assertFalse(p.isKnownRoot(bytes32(0)));
    }

    // ------------------------------------------------------------------ deposit / withdraw rules

    function test_DepositRules() public {
        vm.startPrank(alice);
        vm.expectRevert(Errors.NotAFieldElement.selector);
        pool.deposit(bytes32(P));
        pool.deposit(bytes32(uint256(1)));
        assertEq(usdc.balanceOf(address(pool)), 100e6);
        vm.expectRevert(abi.encodeWithSelector(Errors.CommitmentExists.selector, bytes32(uint256(1))));
        pool.deposit(bytes32(uint256(1)));
        vm.stopPrank();

        // no allowance / balance
        address broke = makeAddr("broke");
        vm.prank(broke);
        vm.expectRevert(Errors.TransferFailed.selector);
        pool.deposit(bytes32(uint256(2)));
    }

    function test_ConstructorRules() public {
        vm.expectRevert(Errors.InvalidParams.selector);
        new KakushiPool(verifier, address(usdc), 0, CAP);
        vm.expectRevert(Errors.InvalidParams.selector);
        new KakushiPool(verifier, address(usdc), 2 ** 128, CAP);
        vm.expectRevert(Errors.InvalidParams.selector);
        new KakushiPool(verifier, makeAddr("eoa-token"), 1, CAP);
        vm.expectRevert(Errors.ZeroAddress.selector);
        new KakushiPool(verifier, address(0), 1e6, CAP); // no native-coin pools on Arc
        vm.expectRevert(Errors.ZeroAddress.selector);
        new KakushiPool(IVerifier(address(0)), address(usdc), 1e6, CAP);
        vm.expectRevert(Errors.InvalidParams.selector);
        new KakushiPool(verifier, address(usdc), 1e6, 0);
        vm.expectRevert(Errors.InvalidParams.selector);
        new KakushiPool(verifier, address(usdc), 1e6, uint32(1 << 20) + 1);
    }

    function test_DepositCapStopsTheBeta() public {
        KakushiPool p = new KakushiPool(IVerifier(address(new ToggleVerifier())), address(usdc), 1e6, 3);
        _fund(alice, p);
        for (uint256 i = 1; i <= 3; i++) _deposit(p, alice, bytes32(i));
        vm.prank(alice);
        vm.expectRevert(Errors.TreeFull.selector);
        p.deposit(bytes32(uint256(4)));
        assertEq(usdc.balanceOf(address(p)), 3e6);
    }

    function test_WithdrawRules() public {
        ToggleVerifier tv = new ToggleVerifier();
        KakushiPool p = new KakushiPool(IVerifier(address(tv)), address(usdc), 1e6, CAP);
        _fund(alice, p);
        _deposit(p, alice, bytes32(uint256(7)));
        bytes32 root = p.getLastRoot();

        vm.expectRevert(abi.encodeWithSelector(Errors.FeeTooHigh.selector, 2e6, 1e6));
        p.withdraw("", root, bytes32(uint256(1)), recipient, relayer, 2e6);
        vm.expectRevert(Errors.InvalidRecipient.selector);
        p.withdraw("", root, bytes32(uint256(1)), address(0), relayer, 0);
        vm.expectRevert(Errors.InvalidRecipient.selector);
        p.withdraw("", root, bytes32(uint256(1)), recipient, address(0), 1);
        vm.expectRevert(Errors.NotAFieldElement.selector);
        p.withdraw("", root, bytes32(P), recipient, relayer, 0);
        tv.set(false);
        vm.expectRevert(Errors.InvalidProof.selector);
        p.withdraw("", root, bytes32(uint256(1)), recipient, relayer, 0);
        tv.set(true);
        p.withdraw("", root, bytes32(uint256(1)), recipient, address(0), 0);
        assertEq(usdc.balanceOf(recipient), 1e6);
    }

    /// Circle's blocklist: a blocklisted recipient makes the withdrawal revert AND the note stays unspent, so the
    /// holder can withdraw to a different address.
    function test_BlocklistedRecipientKeepsTheNoteSpendable() public {
        KakushiPool p = new KakushiPool(IVerifier(address(new ToggleVerifier())), address(usdc), 10e6, CAP);
        _fund(alice, p);
        _deposit(p, alice, bytes32(uint256(9)));
        bytes32 root = p.getLastRoot();
        CircleUSDC.blacklist(recipient);
        vm.expectRevert(Errors.TransferFailed.selector);
        p.withdraw("", root, bytes32(uint256(3)), recipient, relayer, 1e6);
        assertFalse(p.isSpent(bytes32(uint256(3))));
        address other = makeAddr("other");
        p.withdraw("", root, bytes32(uint256(3)), other, relayer, 1e6);
        assertEq(usdc.balanceOf(other), 9e6);
        assertEq(usdc.balanceOf(relayer), 1e6);
    }

    function test_DepositIsReentrancySafe() public {
        ReentrantToken evil = new ReentrantToken();
        KakushiPool p = new KakushiPool(verifier, address(evil), 10e6, CAP);
        evil.mint(alice, 100e6);
        vm.prank(alice);
        evil.approve(address(p), type(uint256).max);
        evil.arm(address(p), abi.encodeCall(KakushiPool.deposit, (bytes32(uint256(77)))));
        _deposit(p, alice, bytes32(uint256(76)));
        assertTrue(evil.reentered());
        assertFalse(evil.reenterSucceeded(), "re-entrant deposit blocked");
        assertEq(p.nextIndex(), 1);
    }

    function test_UsdcMetadataMatchesArc() public view {
        assertEq(usdc.decimals(), 6);
        assertEq(usdc.name(), "USDC");
        assertEq(usdc.version(), "2");
    }
}
