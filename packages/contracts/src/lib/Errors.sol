// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Every custom error in Kakushi, in one grep-able place.
library Errors {
    error ZeroAddress();
    error InvalidParams();
    error WrongValue(uint256 got, uint256 expected);
    error TransferFailed();

    // stealth payments + shielded pool
    error InvalidStealthAddress();
    error InvalidEphemeralPubKey();
    error ZeroAmount();
    error NotAFieldElement();
    error CommitmentExists(bytes32 commitment);
    error TreeFull();
    error UnknownRoot(bytes32 root);
    error NullifierSpent(bytes32 nullifierHash);
    error FeeTooHigh(uint256 fee, uint256 denomination);
    error InvalidRecipient();
    error InvalidProof();
}
