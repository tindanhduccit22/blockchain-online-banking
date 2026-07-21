// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract VaultManager is Ownable, Pausable {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    address public feeReceiver;

    event VaultFunded(address indexed funder, uint256 amount);
    event VaultWithdrawn(address indexed receiver, uint256 amount);
    event FeeReceiverUpdated(
        address indexed oldReceiver,
        address indexed newReceiver
    );

    constructor(
        address tokenAddress,
        address initialFeeReceiver
    ) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token address");
        require(initialFeeReceiver != address(0), "Invalid fee receiver");

        token = IERC20(tokenAddress);
        feeReceiver = initialFeeReceiver;
    }

    function fundVault(uint256 amount) external {
        require(amount > 0, "Amount must be greater than zero");

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit VaultFunded(msg.sender, amount);
    }

    function withdrawVault(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than zero");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient vault balance"
        );

        token.safeTransfer(msg.sender, amount);

        emit VaultWithdrawn(msg.sender, amount);
    }

    function setFeeReceiver(address newFeeReceiver) external onlyOwner {
        require(newFeeReceiver != address(0), "Invalid fee receiver");

        address oldReceiver = feeReceiver;
        feeReceiver = newFeeReceiver;

        emit FeeReceiverUpdated(oldReceiver, newFeeReceiver);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getVaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}