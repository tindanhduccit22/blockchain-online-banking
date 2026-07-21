# Requirements Notes

## Main Roles

### Depositor
- View saving plans.
- Open a deposit.
- Receive an NFT deposit certificate.
- Withdraw at maturity.
- Withdraw early with a penalty.
- Manually renew a deposit.
- Use the auto-renew mechanism after the grace period.

### Bank Admin
- Create and manage saving plans.
- Fund the interest vault.
- Withdraw available vault funds.
- Set the fee receiver.
- Pause and unpause the system.

## Core Contracts

1. MockUSDC
2. VaultManager
3. SavingCore

## Important Business Rules

- MockUSDC uses 6 decimals.
- User principal and bank interest funds must remain separate.
- APR and penalty are snapshotted when a deposit is opened.
- Existing deposits are not affected by future plan APR changes.
- Early withdrawal earns no interest.
- Early withdrawal penalty is sent to the fee receiver.
- Interest is paid from VaultManager.
- Auto-renew preserves the original APR.
- Withdrawals and renewals are blocked when the system is paused.

## Testing Requirement

Smart contract test coverage must be above 90%.