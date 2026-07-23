# Blockchain Online Banking

A decentralized fixed-term savings platform built with Solidity, Hardhat, React, ethers.js, and MetaMask.

The system allows users to deposit MockUSDC into fixed-term saving plans, receive ERC721 NFT deposit certificates, withdraw at maturity, withdraw early with a penalty, manually renew matured deposits, and configure automatic renewal.

---

# Personal Variant

Student ID ending digits:

```text
A = 0
B = 2
```

According to the assignment formulas:

```text
Grace Period
= (A mod 3) + 2
= (0 mod 3) + 2
= 2 days

Default APR
= 200 + A × 25
= 200 BPS
= 2%

Early Withdrawal Penalty
= 300 + B × 50
= 400 BPS
= 4%

Default Tenor
= 90 days
```

Therefore, the default saving plan used in this project is:

```text
Tenor: 90 days
APR: 200 BPS = 2%
Minimum Deposit: 100 USDC
Maximum Deposit: 10,000 USDC
Early Withdrawal Penalty: 400 BPS = 4%
Grace Period: 2 days
```

These personal-variant values are used in the implementation, tests, and demonstration flows.

---

# 1. Project Overview

Blockchain Online Banking is a decentralized savings application that simulates fixed-term bank deposits using smart contracts.

Users deposit MockUSDC into a saving plan managed by `SavingCore`.

Each deposit is represented by an ERC721 NFT called a:

```text
Saving Deposit Certificate (SDC)
```

The NFT represents ownership and control of the corresponding deposit.

The project contains three main smart contracts:

```text
MockUSDC.sol
VaultManager.sol
SavingCore.sol
```

The project also includes a React frontend connected to MetaMask using ethers.js.

---

# 2. Technology Stack

## Smart Contracts

```text
Solidity ^0.8.28
Hardhat
OpenZeppelin Contracts
ERC20
ERC721
SafeERC20
Ownable
Pausable
```

## Frontend

```text
React
Vite
ethers.js
MetaMask
```

## Testing

```text
Hardhat
Mocha
Chai
Solidity Coverage
```

---

# 3. Smart Contract Architecture

The system separates deposited principal from the interest reserve.

```text
                   +----------------+
                   |      User      |
                   +-------+--------+
                           |
                           | MockUSDC Deposit
                           v
                   +----------------+
                   |   SavingCore   |
                   |                |
                   | Saving Plans   |
                   | Deposits       |
                   | Principal      |
                   | ERC721 NFTs    |
                   +-------+--------+
                           |
                           | Interest request
                           v
                   +----------------+
                   |  VaultManager  |
                   |                |
                   | Interest Vault |
                   | Fee Receiver   |
                   +----------------+
```

The key accounting rule is:

```text
Principal → held by SavingCore

Interest reserve → held by VaultManager
```

This separation makes the source of principal and interest explicit.

---

# 4. Smart Contracts

## 4.1 MockUSDC

`MockUSDC` is a mock ERC20 token used to simulate USDC in the local development environment.

It uses:

```text
6 decimals
```

similar to real USDC.

MockUSDC is used for:

- Deposits
- Principal withdrawals
- Interest payments
- Early withdrawal penalties
- Manual renewal
- Automatic renewal

The mint function is intended for local testing and demonstration.

---

## 4.2 VaultManager

`VaultManager` manages the interest reserve used by the savings system.

Its responsibilities include:

- Holding funds reserved for interest
- Funding the vault
- Paying interest
- Managing the fee receiver
- Restricting interest payout to the authorized `SavingCore`
- Emergency pause/unpause

The contract uses:

```solidity
Ownable
Pausable
```

Only the owner can pause or unpause the vault.

Example:

```solidity
function pause() external onlyOwner {
    _pause();
}

function unpause() external onlyOwner {
    _unpause();
}
```

Interest payout is protected by:

```solidity
onlySavingCore
whenNotPaused
```

Therefore, arbitrary users cannot directly request interest from the vault.

---

## 4.3 SavingCore

`SavingCore` is the main smart contract.

It manages:

- Saving plans
- Saving deposits
- ERC721 Saving Deposit Certificates
- Deposit ownership
- Interest calculation
- Penalty calculation
- Maturity withdrawal
- Early withdrawal
- Manual renewal
- Auto-renew configuration
- Auto-renew processing
- Emergency pause/unpause

The NFT collection is used as the ownership certificate for deposits.

```text
Saving Deposit Certificate
Symbol: SDC
```

The NFT token ID corresponds to the deposit ID.

---

# 5. Saving Plans

The contract owner can manage saving plans.

Supported administrative operations include:

```text
Create Plan
Update Plan
Enable Plan
Disable Plan
```

A saving plan contains important parameters such as:

```text
Tenor
APR
Minimum Deposit
Maximum Deposit
Early Withdrawal Penalty
Enabled Status
```

The default plan uses the personal variant:

```text
Plan #0

Tenor: 90 days
APR: 2%
Minimum Deposit: 100 USDC
Maximum Deposit: 10,000 USDC
Penalty: 4%
Enabled: true
```

---

# 6. Deposit Snapshot Design

When a user opens a deposit, important plan parameters are copied into the deposit.

A deposit stores information including:

```text
Principal
Plan ID
Opened Time
Maturity Time
Tenor
APR at Open
Penalty at Open
Status
Auto Renew Setting
```

The important snapshot fields include:

```text
aprBpsAtOpen
penaltyBpsAtOpen
tenorDays
```

This prevents later administrative plan changes from silently changing the terms of an existing deposit.

For example:

```text
User opens deposit at APR = 2%

Admin later changes plan APR to 3%

Existing deposit:
still uses 2%

New deposit:
uses the updated plan APR
```

This makes deposit terms predictable after the deposit has been opened.

---

# 7. Core Features

## 7.1 Open Saving Deposit

The user selects a saving plan and enters a MockUSDC amount.

Example:

```text
Plan: #0
Deposit: 500 USDC
APR: 2%
Tenor: 90 days
```

The user first approves MockUSDC spending.

Then the user calls the deposit function.

Flow:

```text
User
 |
 | Approve MockUSDC
 v
MockUSDC
 |
 | Open Deposit
 v
SavingCore
 |
 +--> Transfer principal
 |
 +--> Store deposit snapshot
 |
 +--> Mint ERC721 certificate
```

After creation:

```text
Status: ACTIVE
Auto Renew: OFF
```

Auto-renew is disabled by default.

---

## 7.2 NFT Saving Deposit Certificate

Every saving deposit is represented by an ERC721 NFT.

Example:

```text
Deposit #0
NFT Token ID #0
```

Deposit ownership follows the NFT owner.

The contract checks ownership using:

```solidity
ownerOf(depositId)
```

Therefore, the current owner of the NFT controls owner-restricted deposit operations.

---

## 7.3 Deposit Status

The project uses:

```solidity
enum DepositStatus {
    ACTIVE,
    WITHDRAWN,
    MANUAL_RENEWED,
    AUTO_RENEWED
}
```

The numeric values are:

```text
0 = ACTIVE
1 = WITHDRAWN
2 = MANUAL_RENEWED
3 = AUTO_RENEWED
```

These states prevent completed deposits from being processed again.

---

## 7.4 Interest Calculation

The system uses simple interest.

Formula:

```text
Interest
=
Principal × APR_BPS × TenorDays
--------------------------------
10000 × 365
```

Example:

```text
Principal = 500 USDC
APR = 2%
Tenor = 90 days
```

Expected interest is approximately:

```text
2.465753 USDC
```

The calculation uses integer arithmetic because Solidity does not support floating-point arithmetic.

---

## 7.5 Withdraw at Maturity

A deposit is mature when:

```solidity
block.timestamp >= deposit.maturityAt
```

At maturity, the owner can withdraw:

```text
Principal + Interest
```

The funds come from separate sources:

```text
Principal
    ↓
SavingCore

Interest
    ↓
VaultManager
```

After successful withdrawal:

```text
ACTIVE
  ↓
WITHDRAWN
```

This prevents double withdrawal.

---

## 7.6 Early Withdrawal

Early withdrawal is available only before maturity:

```solidity
block.timestamp < deposit.maturityAt
```

A penalty is calculated:

```text
Penalty
=
Principal × PenaltyBps
----------------------
10000
```

Example:

```text
Principal = 500 USDC
Penalty = 4%

Penalty Amount = 20 USDC

User Receives = 480 USDC
```

No maturity interest is paid for an early withdrawal.

After completion:

```text
Status = WITHDRAWN
```

---

## 7.7 Manual Renewal

A matured deposit can be manually renewed by its owner.

The renewal principal is:

```text
New Principal
=
Old Principal
+
Earned Interest
```

The old principal is already held by `SavingCore`.

The interest is supplied by `VaultManager`.

The old deposit becomes:

```text
MANUAL_RENEWED
```

A new deposit is created and a new NFT certificate is minted.

Example:

```text
Deposit #0

500.000000 USDC

        ↓ Manual Renew

Deposit #0
Status = MANUAL_RENEWED

        +

Deposit #1
Principal = 502.465753 USDC
Status = ACTIVE
```

A second renewal can produce:

```text
Deposit #0
500.000000
MANUAL_RENEWED

        ↓

Deposit #1
502.465753
MANUAL_RENEWED

        ↓

Deposit #2
504.943666
ACTIVE
```

This preserves the historical record of each manual saving term.

---

## 7.8 Auto Renew

Users can enable or disable auto-renew for an active deposit.

Example:

```text
Auto Renew: OFF

      ↓

Enable Auto Renew

      ↓

Auto Renew: ON
```

The personal grace period is:

```text
2 days
```

Auto-renew processing is performed through an external transaction.

Smart contracts cannot automatically wake themselves up at a future time.

Therefore, an external caller, bot, keeper, or automation service must call the processing function.

The renewal flow is:

```text
Deposit reaches maturity
        ↓
Grace period
        ↓
External caller processes auto-renew
        ↓
Interest calculated
        ↓
VaultManager supplies interest
        ↓
Interest added to principal
        ↓
Deposit receives new saving term
```

The principal becomes:

```text
New Principal
=
Old Principal
+
Interest
```

---

## 7.9 Pause / Unpause

The system implements emergency pause functionality.

`SavingCore` uses `Pausable` to block important state-changing user operations during an emergency.

Important operations protected by `whenNotPaused` include deposit lifecycle actions such as:

```text
Open Deposit
Withdraw at Maturity
Early Withdraw
Manual Renew
Set Auto Renew
Process Auto Renew
```

`VaultManager` also supports pause/unpause.

Interest payout is blocked while the vault is paused.

Only the contract owner can perform administrative pause/unpause operations.

The pause behavior is covered by automated tests.

---

## 7.10 Required Events

The system emits events for important state changes.

Important events include:

```text
PlanCreated
PlanUpdated
PlanStatusChanged
DepositOpened
Withdrawn
Renewed
DepositWithdrawn
DepositWithdrawnEarly
AutoRenewUpdated
DepositRenewed
DepositManuallyRenewed
```

The required `DepositOpened` event includes the APR snapshot:

```text
depositId
owner
planId
principal
maturityAt
aprBpsAtOpen
```

The `Withdrawn` event distinguishes normal and early withdrawals using:

```text
isEarly
```

Additional detailed events are retained to provide more information for frontend/indexing use.

---

# 8. Testing and Design Analysis

## 8.1 Automated Tests and Coverage

The project contains automated tests for the core smart-contract behavior.

Current result:

```text
95 passing
0 failing
```

Final coverage:

```text
Statements: 98.47%
Branches:   90.85%
Functions:  100%
Lines:      98.71%
```

The test suite covers major flows including:

```text
MockUSDC behavior
Saving plan creation
Saving plan updates
Enable/disable plan
Deposit opening
Deposit amount validation
NFT ownership
Interest calculation
Penalty calculation
Maturity withdrawal
Early withdrawal
Manual renewal
Auto-renew configuration
Auto-renew processing
Vault funding and payout
Access control
Pause/unpause
Operations blocked while paused
Invalid-state reverts
Boundary and edge cases
```

The project satisfies the required overall test coverage threshold of above 90%.

---

# 8.2 Open Design Questions

## 8.2.1 Transferable Certificate

### Question

The deposit NFT can be transferred.

If Alice sells her NFT to Bob before maturity, who can withdraw: Alice or Bob?

Is this behavior good or dangerous?

### Answer

In this implementation, **Bob can withdraw the deposit after receiving the NFT**.

The reason is that deposit authorization follows the current ERC721 owner.

Owner-restricted operations use a check equivalent to:

```solidity
require(
    ownerOf(depositId) == msg.sender,
    "Not deposit owner"
);
```

The important line is:

```solidity
ownerOf(depositId) == msg.sender
```

Suppose:

```text
Alice opens Deposit #0
        ↓
Alice owns NFT #0
        ↓
Alice transfers NFT #0 to Bob
        ↓
ownerOf(0) = Bob
```

After the transfer, Alice is no longer the NFT owner.

Therefore:

```text
Alice → cannot perform owner-restricted withdrawal

Bob → can perform owner-restricted withdrawal
```

### Is this good or dangerous?

It can be both.

It is useful because the NFT acts as a truly transferable financial certificate.

Ownership rights move together with the NFT.

However, it can also be dangerous because a user may think they are transferring only a collectible NFT while actually transferring control over the underlying deposit.

A production system could reduce this risk by:

- Making the NFT non-transferable
- Requiring special transfer confirmation
- Using an allowlist
- Clearly warning that transferring the NFT transfers deposit rights

### Design choice

This project follows the transferable-certificate model.

The current NFT owner controls the deposit.

### Code to show during oral defense

Search for:

```solidity
ownerOf(depositId) == msg.sender
```

This is the ownership rule that determines whether Alice or Bob controls the deposit.

---

## 8.2.2 Empty Vault

### Question

A deposit reaches maturity, but `VaultManager` does not have enough MockUSDC to pay the interest.

What happens?

What problem does this create?

What alternative design could be used?

### Answer

The current implementation follows the base specification:

```text
If the vault cannot pay the required interest,
the transaction reverts.
```

`VaultManager` checks whether it has enough tokens before paying interest.

The logic is equivalent to:

```solidity
require(
    token.balanceOf(address(this)) >= amount,
    "Insufficient vault balance"
);
```

If the vault does not have enough funds:

```text
Maturity withdrawal
        ↓
Request interest from VaultManager
        ↓
Insufficient balance
        ↓
REVERT
```

Because Ethereum transactions are atomic, the whole transaction is reverted.

### Problem for the user

This creates an important usability and financial problem.

The user's principal may already be held by `SavingCore`, but the user cannot complete the normal maturity withdrawal because the interest reserve is underfunded.

Therefore:

```text
The user's own principal can temporarily become inaccessible
through the normal maturity-withdrawal flow.
```

This is a weakness of the base design.

### Alternative design 1: Principal-first withdrawal

A better user-protection design could be:

```text
At maturity:

Pay principal immediately
        ↓
If vault has enough interest:
    pay interest

Otherwise:
    record unpaid interest
        ↓
User claims interest later
```

This guarantees that the user's principal is always recoverable.

### Alternative design 2: Interest claim queue

The contract could record:

```text
pendingInterest[user] += interest
```

Users could later call:

```text
claimInterest()
```

when the vault is funded.

### Which design did this project choose?

This project follows the **base specification's atomic revert model**.

The reason is to keep the required base implementation consistent and simple:

```text
Either the full operation succeeds

or

the whole operation reverts
```

A principal-first design would be a valuable production improvement and corresponds closely to the optional Creative Challenge C1.

### Code to show during oral defense

In `VaultManager.sol`, show the vault balance requirement in `payoutInterest()`:

```solidity
require(
    token.balanceOf(address(this)) >= amount,
    "Insufficient vault balance"
);
```

---

## 8.2.3 Dead Auto-Renew Bot

### Question

The auto-renew bot goes offline for one month.

What happens to deposits that passed the grace period?

Does the user lose anything?

How could the design protect users?

### Answer

A smart contract cannot automatically execute itself.

Even if:

```text
Auto Renew = ON
```

someone still needs to send a transaction that calls:

```solidity
processAutoRenew(depositId)
```

Therefore, if the external bot or keeper goes offline:

```text
Deposit reaches maturity
        ↓
Grace period passes
        ↓
No caller executes processAutoRenew()
        ↓
Auto-renew is not processed automatically
```

The tokens do not disappear simply because the bot is offline.

The deposit remains represented in the smart contract.

However, the user may lose the expected automatic-renewal behavior if the processing window is missed.

The current implementation includes timing rules for processing auto-renew, so a sufficiently long bot outage may cause the renewal window to be missed.

### Does the user lose principal automatically?

No.

The bot being offline does not automatically transfer or destroy the user's principal.

The main risk is:

```text
Auto-renew may not happen at the expected time.
```

### Proposed improvement

A stronger production design could use multiple independent automation mechanisms.

For example:

```text
Keeper A
Keeper B
Keeper C
Public permissionless callers
```

Any caller could trigger a valid renewal when the conditions are satisfied.

Another improvement would be to avoid a strict expiration window.

Instead, after the grace period:

```text
If Auto Renew = ON
and renewal has not been processed,

allow processing later
```

This prevents a temporary bot outage from permanently missing the renewal.

### Design choice

The current project follows the implemented external-caller model.

The system does not assume that a Solidity contract can schedule its own future execution.

### Code to show during oral defense

Show:

```solidity
processAutoRenew(uint256 depositId)
```

and its timestamp checks.

Explain:

```text
The contract contains the rules,
but an external transaction is still required to execute them.
```

---

## 8.2.4 Rounding Dust

### Question

The interest formula uses integer division.

Who keeps the rounding dust?

Can rounding cause a revert or an incorrect balance?

### Answer

Solidity performs integer arithmetic.

The interest calculation is equivalent to:

```solidity
interest =
    (principal * aprBps * tenorDays)
    /
    (10000 * 365);
```

Any fractional remainder is truncated.

For example, if the mathematically exact result were:

```text
2.465753424...
```

the contract can only represent the amount at the token's supported precision.

MockUSDC uses:

```text
6 decimals
```

The calculated value is rounded down through integer division.

### Who gets the dust?

The user receives only the integer amount returned by the formula.

Therefore, the fractional amount that was truncated is **not paid to the user**.

Conceptually, this favors the vault/system because the contract never rounds the interest upward.

The contract does not create a separate transferable "dust balance"; the unrepresented fractional remainder simply never becomes part of the payout amount.

### Can this create an incorrect token balance?

It should not create extra tokens or make the contract overpay.

The important property is:

```text
Calculated interest <= exact mathematical interest
```

because integer division rounds down.

Therefore, rounding cannot make the system pay more interest than calculated.

### Can rounding cause a revert?

Normal rounding itself does not cause a revert.

For very small values, the calculated interest could become:

```text
0
```

because of integer truncation.

The contract handles interest conditionally in relevant flows using logic such as:

```solidity
if (interest > 0) {
    ...
}
```

Therefore, zero interest does not require an unnecessary positive-interest payout.

### Test evidence

The automated test suite tests interest calculation using integer values and expected Solidity arithmetic.

The project's tested deposit examples also demonstrate deterministic six-decimal results such as:

```text
500 USDC
→ approximately 2.465753 USDC interest
```

and renewal:

```text
500.000000
+
2.465753
=
502.465753 USDC
```

The tests compare exact integer token-unit results rather than floating-point approximations.

### Code/test to show during oral defense

Show:

```solidity
calculateInterest(...)
```

and one test that calculates:

```javascript
const expectedInterest =
    await savingCore.calculateInterest(...);
```

and compares the returned integer value.

The key explanation is:

```text
Solidity rounds down.
The user never receives more than the formula result.
The tests compare exact integer token units.
```

---

## 8.2.5 Boundary Times

### Question

At the exact second of `maturityAt`, is a withdrawal early or at maturity?

At the exact end of the grace period, what operations are allowed?

Why were `<` and `>=` chosen?

### Answer

The implementation intentionally uses complementary timestamp comparisons.

### Early withdrawal

Early withdrawal requires:

```solidity
block.timestamp < deposit.maturityAt
```

Therefore:

```text
Before maturityAt:
Early Withdrawal allowed

Exactly at maturityAt:
Early Withdrawal NOT allowed
```

### Maturity withdrawal

Maturity withdrawal requires:

```solidity
block.timestamp >= deposit.maturityAt
```

Therefore:

```text
Exactly at maturityAt:
Maturity Withdrawal allowed
```

This creates a clean boundary:

```text
timestamp < maturityAt
    → early

timestamp >= maturityAt
    → matured
```

There is no one-second gap where neither withdrawal method is valid.

### Manual renewal

Manual renewal requires the deposit to have matured.

The maturity comparison is:

```solidity
block.timestamp >= oldDeposit.maturityAt
```

Therefore, the deposit becomes eligible for manual renewal starting at the maturity timestamp.

If the implementation does not add a separate upper grace-period restriction to `renewDeposit()`, then reaching the exact end of the grace period does not by itself invalidate manual renewal.

The exact behavior is determined by the conditions inside `renewDeposit()`.

### Auto-renew processing

Auto-renew uses the grace-period boundary.

The processing condition includes a comparison equivalent to:

```solidity
block.timestamp >=
    deposit.maturityAt + GRACE_PERIOD
```

Therefore:

```text
Before end of grace period:
Auto-renew processing not yet available

Exactly at end of grace period:
Auto-renew processing becomes available
```

### Why use `>=`?

Using:

```solidity
>=
```

means the exact boundary second is included.

This avoids an unnecessary one-second gap.

### Code to show during oral defense

Search for these comparisons:

```solidity
block.timestamp < deposit.maturityAt
```

```solidity
block.timestamp >= deposit.maturityAt
```

or in manual renewal:

```solidity
block.timestamp >= oldDeposit.maturityAt
```

and the auto-renew grace-period condition.

---

## 8.2.6 Disabled Plan with Active Deposits

### Question

The admin disables a saving plan while many deposits from that plan are still active.

What can those users still do?

Can they manually renew into the disabled plan?

### Answer

Disabling a plan should prevent new use of that plan without destroying existing deposits.

Existing deposits store snapshot values such as:

```text
tenorDays
aprBpsAtOpen
penaltyBpsAtOpen
```

Therefore, an active deposit does not depend on the plan remaining enabled for its existing contractual terms.

Example:

```text
User opens Deposit #0
using Plan #0

APR snapshot = 2%
Penalty snapshot = 4%
Tenor snapshot = 90 days

        ↓

Admin disables Plan #0
```

Deposit #0 still has its own stored terms.

The user can still perform lifecycle actions permitted by the deposit state, such as withdrawal according to the contract rules.

### Can new users open deposits in the disabled plan?

No.

Opening a deposit requires the selected plan to be enabled.

### Can a user manually renew into a disabled plan?

No.

Manual renewal checks the newly selected plan.

The implementation contains:

```solidity
require(
    newPlan.enabled,
    "Plan is disabled"
);
```

Therefore:

```text
Existing deposit from disabled plan:
still exists and retains snapshot terms

New deposit into disabled plan:
not allowed

Manual renew INTO disabled plan:
not allowed
```

### Why is this rule useful?

It protects existing users while allowing the administrator to retire an outdated saving product.

The admin cannot retroactively erase the original APR/penalty terms of an already-opened deposit simply by disabling its plan.

### Code to show during oral defense

Show the deposit snapshot fields:

```text
aprBpsAtOpen
penaltyBpsAtOpen
tenorDays
```

and in manual renewal:

```solidity
require(
    newPlan.enabled,
    "Plan is disabled"
);
```

---

## 8.2.7 Attack Thinking

### Question

Describe one realistic attack and show how the code prevents it.

### Selected attack: Double Withdrawal

A realistic attack is attempting to withdraw the same deposit multiple times.

Without state protection, an attacker could try:

```text
Withdraw Deposit #0
        ↓
Receive funds

        ↓

Call Withdraw Deposit #0 again
        ↓
Try to receive funds twice
```

This could drain contract funds if the deposit remained withdrawable.

### Defense 1: Deposit status

Withdrawal operations require the deposit to be active.

The code checks:

```solidity
require(
    deposit.status == DepositStatus.ACTIVE,
    "Deposit is not active"
);
```

After a successful normal withdrawal:

```text
ACTIVE
   ↓
WITHDRAWN
```

After manual renewal:

```text
ACTIVE
   ↓
MANUAL_RENEWED
```

Therefore, the same completed deposit cannot pass the `ACTIVE` check again.

### Defense 2: Ownership validation

The caller must also own the NFT.

The important ownership check is:

```solidity
require(
    ownerOf(depositId) == msg.sender,
    "Not deposit owner"
);
```

An unrelated wallet cannot withdraw another user's deposit.

### Defense 3: Checks-Effects-Interactions

For sensitive withdrawal flows, the contract updates important internal state before completing external token interactions where applicable.

Conceptually:

```text
CHECKS
    ↓
Validate status
Validate owner
Validate time

EFFECTS
    ↓
Change deposit status

INTERACTIONS
    ↓
Transfer principal / request interest
```

This reduces the opportunity for repeated processing during external interactions.

### Defense 4: SafeERC20

Token transfers use OpenZeppelin's:

```solidity
SafeERC20
```

This provides safer handling of ERC20 transfer behavior.

### Why double withdrawal fails

After the first successful withdrawal:

```text
deposit.status = WITHDRAWN
```

A second attempt reaches:

```solidity
require(
    deposit.status == DepositStatus.ACTIVE,
    "Deposit is not active"
);
```

and reverts.

### Code to show during oral defense

Show these two checks:

```solidity
deposit.status == DepositStatus.ACTIVE
```

and:

```solidity
ownerOf(depositId) == msg.sender
```

Then show where the deposit status changes to:

```solidity
DepositStatus.WITHDRAWN
```

before the completed deposit can be processed again.

---

# End of Section 8.2