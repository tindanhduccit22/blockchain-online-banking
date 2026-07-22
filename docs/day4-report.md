# Day 4 Development Report

## Overview

Today focused on implementing the deposit opening flow and NFT-based deposit certificates for the Blockchain Online Banking System.

## Completed Tasks

### 1. Deposit Opening

- Implemented the deposit opening functionality.
- Connected SavingCore with MockUSDC.
- Added ERC20 token approval and transfer flow.
- Added validation for saving plan availability.
- Added minimum and maximum deposit validation.
- Added zero-amount validation.

### 2. Deposit Snapshot

Each deposit stores its own terms at the time it is opened:

- Principal amount
- Saving plan ID
- Opening timestamp
- Maturity timestamp
- Tenor
- APR snapshot
- Early withdrawal penalty snapshot
- Deposit status

This ensures that future changes to a saving plan do not affect existing deposits.

### 3. NFT Deposit Certificate

- Integrated ERC721 into SavingCore.
- Each deposit receives a unique NFT certificate.
- Deposit ID and NFT token ID use the same identifier.
- The NFT is minted to the depositor when a deposit is successfully opened.
- NFT certificates can be transferred to another account.

The current NFT owner will later be used to determine ownership rights for withdrawal and renewal operations.

## Testing

The project currently has:

- 35 passing tests

Tests cover:

- MockUSDC functionality
- VaultManager functionality
- Saving plan management
- Personal variant configuration
- Deposit validation
- Deposit opening
- APR and penalty snapshots
- Maturity calculation
- NFT certificate minting
- NFT certificate transfer

## Current Status

Completed:

- Project setup
- MockUSDC
- VaultManager
- Saving plan management
- Personal variant configuration
- Deposit opening
- Deposit term snapshots
- ERC721 deposit certificates

Next:

- Interest calculation
- Withdrawal at maturity
- Early withdrawal penalty
- NFT ownership-based authorization
- Double-withdrawal protection
- Auto-renew and grace period

## Daily Meeting

### Yesterday

Yesterday, I completed the saving plan management and aligned the plan configuration with my personal variant requirements.

### Today

Today, I implemented the deposit opening flow, deposit term snapshots, and transferable NFT certificates for deposits.

### Blockers

Currently, I do not have any major blockers. I encountered a small ERC721 import issue during development, but it has been resolved.