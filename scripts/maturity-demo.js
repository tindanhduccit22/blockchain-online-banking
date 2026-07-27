const { ethers } = require("hardhat");

async function main() {
  const [owner, user] = await ethers.getSigners();

  // Addresses from current localhost deployment
  const MOCK_USDC_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const VAULT_MANAGER_ADDRESS =
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const SAVING_CORE_ADDRESS =
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  const mockUSDC = await ethers.getContractAt(
    "MockUSDC",
    MOCK_USDC_ADDRESS
  );

  const vaultManager = await ethers.getContractAt(
    "VaultManager",
    VAULT_MANAGER_ADDRESS
  );

  const savingCore = await ethers.getContractAt(
    "SavingCore",
    SAVING_CORE_ADDRESS
  );

  console.log(
    "\n========== MATURITY E2E DEMO =========="
  );

  console.log("Owner:", owner.address);
  console.log("User:", user.address);

  // ==========================================
  // 1. Fund VaultManager for interest payments
  // ==========================================

  const vaultFundAmount =
    ethers.parseUnits("100", 6);

  await (
    await mockUSDC.mint(
      owner.address,
      vaultFundAmount
    )
  ).wait();

  await (
    await mockUSDC.approve(
      VAULT_MANAGER_ADDRESS,
      vaultFundAmount
    )
  ).wait();

  await (
    await vaultManager.fundVault(
      vaultFundAmount
    )
  ).wait();

  console.log(
    "\nVault funded with 100 USDC"
  );

  let vaultBalance =
    await vaultManager.getVaultBalance();

  console.log(
    "Vault balance:",
    ethers.formatUnits(vaultBalance, 6),
    "USDC"
  );

  // ==========================================
  // 2. Get dynamic Deposit ID
  // ==========================================

  const depositId =
    await savingCore.nextDepositId();

  console.log(
    "\nNext Deposit ID:",
    depositId.toString()
  );

  // ==========================================
  // 3. Mint 500 USDC to user
  // ==========================================

  const depositAmount =
    ethers.parseUnits("500", 6);

  await (
    await mockUSDC.mint(
      user.address,
      depositAmount
    )
  ).wait();

  console.log(
    "Minted 500 USDC to user"
  );

  // ==========================================
  // 4. Approve SavingCore
  // ==========================================

  await (
    await mockUSDC
      .connect(user)
      .approve(
        SAVING_CORE_ADDRESS,
        depositAmount
      )
  ).wait();

  console.log(
    "Approved SavingCore for 500 USDC"
  );

  // ==========================================
  // 5. Open new deposit
  // ==========================================

  await (
    await savingCore
      .connect(user)
      .openDeposit(
        0,
        depositAmount
      )
  ).wait();

  console.log(
    "Opened Deposit #" +
      depositId.toString()
  );

  const deposit =
    await savingCore.getDeposit(
      depositId
    );

  console.log(
    "Principal:",
    ethers.formatUnits(
      deposit.principal,
      6
    ),
    "USDC"
  );

  console.log(
    "Maturity timestamp:",
    deposit.maturityAt.toString()
  );

  // ==========================================
  // 6. Calculate expected interest
  // ==========================================

  const expectedInterest =
    await savingCore.calculateInterest(
      deposit.principal,
      deposit.aprBpsAtOpen,
      deposit.tenorDays
    );

  console.log(
    "\nExpected interest:",
    ethers.formatUnits(
      expectedInterest,
      6
    ),
    "USDC"
  );

  // ==========================================
  // 7. Move blockchain time to maturity
  // ==========================================

  await ethers.provider.send(
    "evm_setNextBlockTimestamp",
    [
      Number(deposit.maturityAt)
    ]
  );

  await ethers.provider.send(
    "evm_mine",
    []
  );

  console.log(
    "\nBlockchain time moved to maturity"
  );

  // ==========================================
  // 8. Balance before withdrawal
  // ==========================================

  const userBalanceBefore =
    await mockUSDC.balanceOf(
      user.address
    );

  const vaultBefore =
    await vaultManager.getVaultBalance();

  console.log(
    "\nBefore maturity withdrawal:"
  );

  console.log(
    "User balance:",
    ethers.formatUnits(
      userBalanceBefore,
      6
    ),
    "USDC"
  );

  console.log(
    "Vault balance:",
    ethers.formatUnits(
      vaultBefore,
      6
    ),
    "USDC"
  );

  // ==========================================
  // 9. Withdraw at maturity
  // ==========================================

  await (
    await savingCore
      .connect(user)
      .withdrawAtMaturity(
        depositId
      )
  ).wait();

  console.log(
    "\nMaturity withdrawal successful"
  );

  // ==========================================
  // 10. Check final balances
  // ==========================================

  const userBalanceAfter =
    await mockUSDC.balanceOf(
      user.address
    );

  const vaultAfter =
    await vaultManager.getVaultBalance();

  const finalDeposit =
    await savingCore.getDeposit(
      depositId
    );

  console.log(
    "\nAfter maturity withdrawal:"
  );

  console.log(
    "User balance:",
    ethers.formatUnits(
      userBalanceAfter,
      6
    ),
    "USDC"
  );

  console.log(
    "Vault balance:",
    ethers.formatUnits(
      vaultAfter,
      6
    ),
    "USDC"
  );

  console.log(
    "Deposit status:",
    finalDeposit.status.toString(),
    "(1 = CLOSED)"
  );

  // ==========================================
  // 11. Verify actual amounts
  // ==========================================

  const amountReceived =
    userBalanceAfter -
    userBalanceBefore;

  const vaultSpent =
    vaultBefore -
    vaultAfter;

  console.log(
    "\n========== VERIFICATION =========="
  );

  console.log(
    "Principal returned:",
    ethers.formatUnits(
      depositAmount,
      6
    ),
    "USDC"
  );

  console.log(
    "Expected interest:",
    ethers.formatUnits(
      expectedInterest,
      6
    ),
    "USDC"
  );

  console.log(
    "User actually received:",
    ethers.formatUnits(
      amountReceived,
      6
    ),
    "USDC"
  );

  console.log(
    "Interest paid by Vault:",
    ethers.formatUnits(
      vaultSpent,
      6
    ),
    "USDC"
  );

  const expectedTotal =
    depositAmount +
    expectedInterest;

  console.log(
    "\nExpected total:",
    ethers.formatUnits(
      expectedTotal,
      6
    ),
    "USDC"
  );

  console.log(
    "Correct total received:",
    amountReceived === expectedTotal
  );

  console.log(
    "Correct interest from Vault:",
    vaultSpent === expectedInterest
  );

  console.log(
    "\n========== MATURITY E2E SUCCESS =========="
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});