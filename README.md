# Blockchain Online Banking

A blockchain-based online banking project that implements a decentralized savings system using Solidity smart contracts.

The system allows users to create token-based savings deposits, receive NFT deposit certificates, withdraw deposits at maturity, withdraw early with penalties, and automatically renew matured deposits.

---

## Student Information

- **Student ID:** 2231200120
- **Project:** Blockchain Online Banking
- **Personal Variant:** A = 0, B = 2

The last two digits of the Student ID are used to determine the personal variant values:

- A = 0
- B = 2

---

## Personal Variant

Based on the personal variant values, the project uses the following parameters:

| Parameter | Value |
|---|---:|
| Grace Period | 2 days |
| Default APR | 200 BPS (2%) |
| Early Withdrawal Penalty | 400 BPS (4%) |
| Default Tenor | 90 days |

These parameters are used consistently in the smart contract implementation and tests.

---

## Project Architecture

The system consists of three main smart contracts:

```text
                    User
                     |
                     | Deposit USDC
                     v
               +-------------+
               | SavingCore  |
               +-------------+
                |           |
       NFT      |           | Interest Request
   Certificate  |           |
                v           v
             ERC721    +--------------+
                       | VaultManager |
                       +--------------+
                              |
                              | Interest Payment
                              v
                            User
```

### MockUSDC

`MockUSDC` is an ERC20 token used to simulate USDC in the local development and testing environment.

It is used for:

- Savings deposits
- Interest funding
- Interest payments
- Early withdrawal penalties

### SavingCore

`SavingCore` contains the main savings logic of the system.

Main responsibilities:

- Create and manage saving plans
- Open savings deposits
- Store deposit snapshots
- Mint ERC721 deposit certificates
- Process maturity withdrawals
- Process early withdrawals
- Configure auto-renew
- Process automatic deposit renewal
- Calculate interest and penalties

### VaultManager

`VaultManager` manages funds used for interest payments.

Main responsibilities:

- Receive vault funding
- Pay interest requested by the authorized `SavingCore`
- Manage the fee receiver
- Authorize the `SavingCore` contract
- Allow administrative withdrawals
- Support pause/unpause controls

---

## Main Features

### Saving Plans

The contract owner can create configurable saving plans with:

- Tenor
- APR
- Minimum deposit
- Maximum deposit
- Early withdrawal penalty
- Enabled/disabled status

The default saving plan used in the local deployment is:

| Parameter | Value |
|---|---:|
| Tenor | 90 days |
| APR | 200 BPS (2%) |
| Minimum Deposit | 100 USDC |
| Maximum Deposit | 10,000 USDC |
| Early Withdrawal Penalty | 400 BPS (4%) |

---

### Savings Deposit

Users can open a deposit by selecting an enabled saving plan.

When a deposit is opened:

1. USDC is transferred from the user to `SavingCore`.
2. Deposit parameters are stored as a snapshot.
3. A unique deposit ID is created.
4. An ERC721 NFT certificate is minted to the user.

The NFT represents ownership of the savings deposit.

---

### NFT Deposit Certificate

Each savings deposit is represented by an ERC721 token.

```text
Deposit #0
     |
     v
ERC721 NFT #0
     |
     v
User / Deposit Owner
```

Ownership checks are performed using the NFT owner when deposit operations are executed.

---

### Maturity Withdrawal

After a deposit reaches maturity, the deposit owner can withdraw it.

The payment flow is:

```text
SavingCore
    |
    | Principal
    v
   User
    ^
    | Interest
    |
VaultManager
```

The user receives:

```text
Principal + Interest
```

Example tested flow:

```text
Principal: 500 USDC
APR:       2%
Tenor:     90 days

Interest:
≈ 2.465753 USDC

Total received:
≈ 502.465753 USDC
```

---

### Early Withdrawal

Users can withdraw an active deposit before maturity.

An early withdrawal penalty is applied.

Example:

```text
Principal = 500 USDC
Penalty   = 4%

Penalty:
500 × 4% = 20 USDC
```

Result:

```text
User receives:         480 USDC
Fee Receiver receives:  20 USDC
```

---

### Auto-Renew

Deposit owners can enable automatic renewal.

When an eligible matured deposit is processed for auto-renew:

1. Interest is calculated.
2. `VaultManager` transfers the interest to `SavingCore`.
3. Interest is added to the deposit principal.
4. The maturity date is extended by another tenor.
5. The deposit remains active.

Example:

```text
Old Principal:
500 USDC

Interest:
2.465753 USDC

New Principal:
502.465753 USDC

Status:
ACTIVE

Auto Renew:
true
```

---

## Smart Contract Security

The project uses OpenZeppelin contracts and utilities.

Security-related mechanisms include:

- `Ownable` access control
- `SafeERC20` token transfers
- `Pausable` support in `VaultManager`
- Authorized `SavingCore` access for interest payouts
- Zero-address validation
- Deposit ownership validation through ERC721
- Checks-Effects-Interactions ordering where applicable
- Deposit status validation
- Balance validation before vault payouts

---

## Project Structure

```text
blockchain-online-banking/
|
├── contracts/
│   ├── interfaces/
│   │   └── IVaultManager.sol
│   ├── MockUSDC.sol
│   ├── SavingCore.sol
│   └── VaultManager.sol
│
├── scripts/
│   ├── deploy.js
│   ├── interact.js
│   ├── maturity-demo.js
│   ├── early-withdraw-demo.js
│   └── auto-renew-demo.js
│
├── test/
│   ├── MockUSDC.test.js
│   ├── SavingCore.test.js
│   └── VaultManager.test.js
│
├── hardhat.config.js
├── package.json
└── README.md
```

---

## Technologies

- Solidity `^0.8.28`
- Hardhat
- JavaScript
- Ethers.js
- OpenZeppelin Contracts
- Mocha
- Chai
- Solidity Coverage

---

## Installation

Clone the repository and install dependencies:

```bash
git clone <repository-url>

cd blockchain-online-banking

npm install
```

---

## Compile Contracts

Run:

```bash
npx hardhat compile
```

---

## Run Tests

Run the complete test suite:

```bash
npx hardhat test
```

Current test result:

```text
91 passing
```

The test suite covers the main functionality of:

- MockUSDC
- SavingCore
- VaultManager
- Saving plan management
- Deposits
- NFT ownership
- Maturity withdrawals
- Early withdrawals
- Interest payments
- Auto-renew
- Access control
- Invalid input and revert cases

---

## Test Coverage

Run:

```bash
npx hardhat coverage
```

Current coverage:

| Metric | Coverage |
|---|---:|
| Statements | 100% |
| Branches | 99.21% |
| Functions | 100% |
| Lines | 100% |

Contract-level branch coverage:

| Contract | Branch Coverage |
|---|---:|
| MockUSDC.sol | 100% |
| SavingCore.sol | 98.89% |
| VaultManager.sol | 100% |

---

## Local Deployment

### 1. Start a Local Hardhat Node

Open a terminal:

```bash
npx hardhat node
```

Keep this terminal running.

### 2. Deploy Contracts

Open another terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

The deployment script:

1. Deploys `MockUSDC`
2. Deploys `VaultManager`
3. Deploys `SavingCore`
4. Authorizes `SavingCore` in `VaultManager`
5. Creates the default saving plan
6. Verifies the initial configuration

---

## End-to-End Demo

The project includes several local end-to-end demonstration scripts.

These scripts are intended for a fresh local deployment or an appropriate local-node state.

### Basic Deposit and NFT

Run:

```bash
npx hardhat run scripts/interact.js --network localhost
```

This demonstrates:

```text
Mint MockUSDC
      |
      v
Approve SavingCore
      |
      v
Open Deposit
      |
      +----> USDC stored in SavingCore
      |
      +----> ERC721 Certificate minted
```

---

### Maturity Withdrawal

Run:

```bash
npx hardhat run scripts/maturity-demo.js --network localhost
```

This demonstrates:

- Opening a savings deposit
- Funding the interest vault
- Advancing blockchain time
- Withdrawing at maturity
- Returning principal
- Paying interest from `VaultManager`
- Verifying final balances

---

### Early Withdrawal

Run:

```bash
npx hardhat run scripts/early-withdraw-demo.js --network localhost
```

This demonstrates:

- Opening a deposit
- Withdrawing before maturity
- Applying the configured penalty
- Returning the remaining principal to the user
- Sending the penalty to the fee receiver

---

### Auto-Renew

Run:

```bash
npx hardhat run scripts/auto-renew-demo.js --network localhost
```

This demonstrates:

```text
Active Deposit
      |
      v
Reach Maturity
      |
      v
Auto-Renew Processing
      |
      +----> Vault pays interest
      |
      +----> Interest added to principal
      |
      +----> Maturity extended
      |
      v
Deposit remains ACTIVE
```

The demo verifies:

- Principal increases correctly
- Maturity is extended correctly
- Deposit remains active
- Auto-renew remains enabled
- Interest is transferred from `VaultManager`
- Interest is added to `SavingCore`

---

## Complete Savings Flow

```text
                    +----------------+
                    |      USER      |
                    +-------+--------+
                            |
                            | Deposit USDC
                            v
                    +----------------+
                    |   SavingCore   |
                    +-------+--------+
                            |
                 +----------+----------+
                 |                     |
                 v                     v
        Deposit Record          ERC721 Certificate
                 |
        +--------+---------+
        |                  |
        v                  v
Early Withdrawal       Maturity
        |                  |
        v                  v
Penalty Applied     Principal Returned
        |                  |
        v                  v
Fee Receiver        VaultManager
                           |
                           v
                    Interest Payment
                           |
                           v
                         USER

                OR

                    Maturity
                       |
                       v
                   Auto-Renew
                       |
                       v
             Interest Added to Principal
                       |
                       v
               New Maturity Date
                       |
                       v
                 ACTIVE Deposit
```

---

## Development Status

Completed:

- Smart contract implementation
- Personalized saving parameters
- ERC20 mock token
- Saving plan management
- Savings deposits
- ERC721 deposit certificates
- Maturity withdrawals
- Early withdrawals
- Vault-based interest payments
- Auto-renew functionality
- Access control and pause mechanisms
- Unit and integration tests
- High test coverage
- Local deployment scripts
- End-to-end demonstration scripts

---

## License

This project uses the MIT License.