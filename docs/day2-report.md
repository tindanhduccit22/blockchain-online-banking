# Day 2 - VaultManager

## Objectives

- Implement the VaultManager smart contract.
- Manage the bank's interest liquidity separately from user principal.
- Add administrative controls for vault management.
- Add unit tests for VaultManager.

## Completed Work

- Implemented VaultManager using OpenZeppelin contracts.
- Added ERC20 token integration using IERC20 and SafeERC20.
- Added fundVault() for funding the interest vault.
- Added withdrawVault() with owner-only access.
- Added setFeeReceiver() for penalty receiver configuration.
- Added pause() and unpause() administrative controls.
- Added getVaultBalance() for checking available vault funds.
- Added validation for zero amounts and invalid addresses.
- Added events for vault funding, withdrawal, and fee receiver updates.
- Added unit tests for VaultManager functionality and access control.

## Security and Access Control

- Vault withdrawals are restricted to the contract owner.
- Fee receiver updates are restricted to the contract owner.
- Pause and unpause operations are restricted to the contract owner.
- SafeERC20 is used for safer ERC20 token transfers.
- Zero-address validation is applied to important addresses.

## Testing

Command:

`npx hardhat test`

Result:

`13 passing`

### MockUSDC

- 3 tests passing.

### VaultManager

- 10 tests passing.

Tested:

- Contract initialization.
- Vault funding.
- Owner vault withdrawal.
- Unauthorized withdrawal rejection.
- Fee receiver updates.
- Unauthorized fee receiver update rejection.
- Pause and unpause controls.
- Zero funding amount validation.
- Invalid fee receiver validation.
- Insufficient vault balance validation.

## Git Progress

### Commit 1

`feat: implement VaultManager contract`

Purpose:

- Implement the VaultManager smart contract.
- Add vault liquidity management.
- Add administrative access control.
- Add VaultManager unit tests.

### Commit 2

`docs: update Day 2 development progress`

Purpose:

- Record Day 2 completed work.
- Update the project development roadmap.

## Next Steps

Day 3 will focus on:

- Implementing the SavingCore foundation.
- Creating saving plan data structures.
- Adding saving plan management.
- Preparing the deposit architecture for future deposit operations.

## Blockers

No major blockers at the end of Day 2.