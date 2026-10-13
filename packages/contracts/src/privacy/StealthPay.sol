// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC5564Announcer} from "../interfaces/IERC5564Announcer.sol";
import {IERC20Min} from "../interfaces/IERC20Min.sol";
import {ReentrancyGuard} from "../lib/ReentrancyGuard.sol";
import {SafeTransfer} from "../lib/SafeTransfer.sol";
import {Errors} from "../lib/Errors.sol";

/// @notice One-transaction stealth payments on Arc: move an ERC-20 (USDC) straight to a stealth address and
///         announce it on the ERC-5564 announcer. Never holds funds. There is no native-coin path: on Arc the
///         native coin is USDC, and the stealth address pays its own gas out of the USDC it receives.
///
///         Announcement metadata (ERC-5564 recommended layout, 57 bytes):
///           [0]      view tag
///           [1..4]   0x23b872dd (ERC-20, transferFrom)
///           [5..24]  token address (USDC)
///           [25..56] amount received by the stealth address (uint256, big-endian)
contract StealthPay is ReentrancyGuard {
    using SafeTransfer for address;

    uint256 public constant SCHEME_SECP256K1 = 1;
    bytes4 public constant TOKEN_SELECTOR = 0x23b872dd;

    IERC5564Announcer public immutable announcer;

    constructor(IERC5564Announcer announcer_) {
        if (address(announcer_) == address(0)) revert Errors.ZeroAddress();
        announcer = announcer_;
    }

    /// @notice Pull `amount` of `token` from the caller (prior approval to this contract) straight to
    ///         `stealthAddress` and announce it.
    function sendToken(
        uint256 schemeId,
        address stealthAddress,
        address token,
        uint256 amount,
        bytes calldata ephemeralPubKey,
        bytes1 viewTag
    ) external nonReentrant {
        _check(schemeId, stealthAddress, ephemeralPubKey);
        if (amount == 0) revert Errors.ZeroAmount();
        uint256 before = IERC20Min(token).balanceOf(stealthAddress);
        token.safeTransferFrom(msg.sender, stealthAddress, amount);
        uint256 received = IERC20Min(token).balanceOf(stealthAddress) - before;
        announcer.announce(
            schemeId, stealthAddress, ephemeralPubKey, abi.encodePacked(viewTag, TOKEN_SELECTOR, token, received)
        );
    }

    function _check(uint256 schemeId, address stealthAddress, bytes calldata ephemeralPubKey) private pure {
        if (stealthAddress == address(0)) revert Errors.InvalidStealthAddress();
        if (schemeId == SCHEME_SECP256K1) {
            // compressed secp256k1 point
            if (ephemeralPubKey.length != 33 || (ephemeralPubKey[0] != 0x02 && ephemeralPubKey[0] != 0x03)) {
                revert Errors.InvalidEphemeralPubKey();
            }
        } else if (ephemeralPubKey.length == 0) {
            revert Errors.InvalidEphemeralPubKey();
        }
    }
}
