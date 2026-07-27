# System Architecture

## Project
Blockchain-Based Online Banking - Term Deposit System

## Overview
The system is a blockchain-based term deposit application where users can deposit MockUSDC into fixed-term saving plans, earn interest, withdraw funds, and renew deposits.

## Core Smart Contracts

### MockUSDC
- ERC20 test token.
- Uses 6 decimals like real USDC.
- Supports minting for local testing.

### VaultManager
- Holds the bank's interest liquidity.
- Manages vault funding and withdrawals.
- Manages the fee receiver.
- Supports emergency pause/unpause.

### SavingCore
- Manages saving plans.
- Handles deposits and withdrawals.
- Handles manual and automatic renewal.
- Issues ERC721 NFTs as deposit certificates.

## Fund Separation

SavingCore holds user principal.

VaultManager holds the bank's interest liquidity.

These two sources of funds must remain separate.

## Technology Stack
- Solidity
- Hardhat
- OpenZeppelin Contracts
- ethers.js
- React
- MetaMask