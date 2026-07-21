# Day 3 - Saving Plans and SavingCore Foundation

## Objectives

- Create the SavingCore smart contract foundation.
- Implement saving plan management.
- Add administrative controls for saving plans.
- Prepare the architecture for deposit functionality.

## Completed Work

- Created the SavingCore smart contract.
- Connected SavingCore with the ERC20 token.
- Added VaultManager address integration.
- Created the SavingPlan data structure.
- Added automatic saving plan IDs.
- Implemented createPlan().
- Implemented updatePlan().
- Implemented setPlanActive().
- Implemented getPlan().
- Added basis points (BPS) representation for APR and penalties.
- Added validation for duration, APR, and penalty values.
- Added owner-only access control for plan management.
- Added events for saving plan creation, updates, and status changes.

## Saving Plan Structure

Each saving plan contains:

- Duration.
- APR in basis points.
- Early withdrawal penalty in basis points.
- Active status.

Basis points are used to represent percentages safely.

Examples:

- 10,000 BPS = 100%
- 500 BPS = 5%
- 200 BPS = 2%

## Access Control

Only the contract owner can:

- Create saving plans.
- Update saving plans.
- Activate or deactivate saving plans.

Users cannot modify bank saving plan configurations.

## Testing

Command:

`npx hardhat test`

Result:

`23 passing`

### Test Summary

- MockUSDC: 3 tests passing.
- VaultManager: 10 tests passing.
- SavingCore: 10 tests passing.

SavingCore tests cover:

- Contract initialization.
- Saving plan creation.
- Unauthorized plan creation.
- Saving plan updates.
- Plan activation and deactivation.
- Unauthorized plan updates.
- Zero duration validation.
- APR validation.
- Penalty validation.
- Invalid plan access.

## Git Progress

### Commit 1

`feat: add saving plan management`

Purpose:

- Add the SavingCore foundation.
- Implement saving plan management.
- Add access control and validation.
- Add SavingCore unit tests.

### Commit 2

`docs: update Day 3 development progress`

Purpose:

- Record completed Day 3 work.
- Update the development roadmap.

## Next Steps

Day 4 will focus on:

- Implementing deposit creation.
- Validating active saving plans.
- Locking user principal.
- Snapshotting saving plan terms at deposit creation.
- Creating NFT deposit certificates.

## Blockers

No major blockers at the end of Day 3.