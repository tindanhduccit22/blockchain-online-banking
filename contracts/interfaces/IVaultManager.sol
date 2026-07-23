// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IVaultManager {
    function payoutInterest(
        address receiver,
        uint256 amount
    ) external;

    function feeReceiver()
        external
        view
        returns (address);
}