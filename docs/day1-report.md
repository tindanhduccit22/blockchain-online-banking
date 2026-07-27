# Day 1 - Project Setup and MockUSDC

## Objectives

- Initialize the blockchain development project.
- Configure Hardhat and required dependencies.
- Set up the initial project structure.
- Implement the MockUSDC test token.
- Add basic unit tests for MockUSDC.

## Completed Work

- Initialized the Git repository.
- Connected the local repository to GitHub.
- Initialized the Node.js project.
- Installed and configured Hardhat.
- Installed OpenZeppelin Contracts.
- Created the initial project structure.
- Added project architecture and requirement documentation.
- Implemented MockUSDC using the ERC20 standard.
- Configured MockUSDC with 6 decimals.
- Added mint functionality for testing.
- Added unit tests for decimals, minting, and token transfers.

## Testing

### Compilation

Command:

`npx hardhat compile`

Result:

`Compiled successfully`

### Unit Tests

Command:

`npx hardhat test`

Result:

`3 passing`

Tested:
- MockUSDC uses 6 decimals.
- Tokens can be minted to an address.
- Tokens can be transferred between accounts.

## Git Progress

### Commit 1

`chore: initialize Hardhat project structure`

Purpose:
- Initialize the Hardhat environment.
- Add dependencies and configuration.
- Add initial project documentation.

### Commit 2

`feat: implement MockUSDC test token`

Purpose:
- Add the first required smart contract.
- Add MockUSDC unit tests.
- Complete Day 1 development.

## Next Steps

Day 2 will focus on VaultManager:

- Manage the bank's interest liquidity.
- Fund the vault.
- Withdraw vault funds.
- Configure the fee receiver.
- Add emergency pause and unpause controls.
- Add VaultManager unit tests.

## Blockers

No major blockers at the end of Day 1.