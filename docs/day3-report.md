# Day 3 - SavingCore and Saving Plan Management

## Objectives

- Implement the SavingCore foundation.
- Implement saving plan management.
- Add minimum and maximum deposit limits.
- Apply the project personal variant values.
- Prepare the contract structure for deposit functionality.

## Completed Work

- Created the SavingCore smart contract.
- Implemented the SavingPlan structure.
- Added saving plan creation and management.
- Added owner-only access control.
- Added plan enable and disable functionality.
- Added minimum and maximum deposit limits.
- Added validation for tenor, APR, penalty, and deposit limits.
- Added personal variant configuration based on Student ID values A = 0 and B = 2.

## Saving Plan Structure

Each saving plan contains:

- Tenor in days.
- APR in basis points.
- Minimum deposit.
- Maximum deposit.
- Early withdrawal penalty in basis points.
- Enabled status.

A value of 0 for a deposit limit means that the corresponding limit is not applied.

## Personal Variant

Student ID parameters:

- A = 0
- B = 2

Calculated values:

- Grace Period: 2 days
- Default APR: 200 BPS (2%)
- Default Early Withdrawal Penalty: 400 BPS (4%)
- Default Tenor: 90 days

## Testing

Command:

`npx hardhat test`

Result:

`25 passing`

The test suite verifies:

- MockUSDC functionality.
- VaultManager functionality.
- SavingCore saving plan management.
- Personal variant values.
- Minimum and maximum deposit limits.
- Invalid deposit limit validation.
- Owner access control.
- APR and penalty validation.
- Plan enable and disable functionality.

## Git Progress

### Feature Commit

`feat: add saving plan management`

Implemented the initial SavingCore and saving plan functionality.

### Requirement Alignment Fix

`fix: align saving plan with project requirements`

Added missing minimum and maximum deposit limits and aligned the saving plan structure with the project requirements.

## Next Steps

Day 4 will focus on:

- Opening deposits.
- Validating saving plan deposit limits.
- Locking user principal in SavingCore.
- Snapshotting deposit terms.
- Implementing ERC721 NFT deposit certificates.

## Blockers

No major blockers at the end of Day 3.