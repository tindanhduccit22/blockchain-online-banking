const { ethers } = require("hardhat");

async function main() {
  const [owner, user] = await ethers.getSigners();

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
    "\n========== AUTO-RENEW E2E DEMO =========="
  );

  // ==========================================
  // 1. Get dynamic deposit ID
  // ==========================================

  const depositId =
    await savingCore.nextDepositId();

  console.log(
    "Deposit ID:",
    depositId.toString()
  );

  // ==========================================
  // 2. Make sure Vault has enough interest
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
    "Added 100 USDC to interest Vault"
  );

  // ==========================================
  // 3. Mint USDC to user
  // ==========================================

  const depositAmount =
    ethers.parseUnits("500", 6);

  await (
    await mockUSDC.mint(
      user.address,
      depositAmount
    )
  ).wait();

  await (
    await mockUSDC
      .connect(user)
      .approve(
        SAVING_CORE_ADDRESS,
        depositAmount
      )
  ).wait();

  // ==========================================
  // 4. Open deposit
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
    "Opened deposit with 500 USDC"
  );

  // ==========================================
  // 5. Enable Auto Renew
  // ==========================================

  await (
    await savingCore
      .connect(user)
      .setAutoRenew(
        depositId,
        true
      )
  ).wait();

  console.log(
    "Auto-renew enabled"
  );

  const before =
    await savingCore.getDeposit(
      depositId
    );

  console.log(
    "\n========== BEFORE RENEWAL =========="
  );

  console.log(
    "Principal:",
    ethers.formatUnits(
      before.principal,
      6
    ),
    "USDC"
  );

  console.log(
    "Maturity:",
    before.maturityAt.toString()
  );

  console.log(
    "Auto Renew:",
    before.autoRenew
  );

  console.log(
    "Status:",
    before.status.toString(),
    "(0 = ACTIVE)"
  );

  // ==========================================
  // 6. Calculate expected interest
  // ==========================================

  const expectedInterest =
    await savingCore.calculateInterest(
      before.principal,
      before.aprBpsAtOpen,
      before.tenorDays
    );

  const expectedNewPrincipal =
    before.principal +
    expectedInterest;

  const expectedNewMaturity =
    before.maturityAt +
    BigInt(before.tenorDays) *
      24n *
      60n *
      60n;

  console.log(
    "\nExpected interest:",
    ethers.formatUnits(
      expectedInterest,
      6
    ),
    "USDC"
  );

  // ==========================================
  // 7. Move beyond maturity + grace period
  // ==========================================

  const GRACE_PERIOD =
    await savingCore.GRACE_PERIOD();

  const processTime =
    before.maturityAt +
    GRACE_PERIOD;

  await ethers.provider.send(
    "evm_setNextBlockTimestamp",
    [
      Number(processTime)
    ]
  );

  await ethers.provider.send(
    "evm_mine",
    []
  );

  console.log(
    "Blockchain moved past maturity + grace period"
  );

  // ==========================================
  // 8. Record balances before renewal
  // ==========================================

  const coreBalanceBefore =
    await mockUSDC.balanceOf(
      SAVING_CORE_ADDRESS
    );

  const vaultBefore =
    await vaultManager.getVaultBalance();

  // ==========================================
  // 9. Process Auto Renew
  // ==========================================

  await (
    await savingCore.processAutoRenew(
      depositId
    )
  ).wait();

  console.log(
    "\nAuto-renew processed successfully"
  );

  // ==========================================
  // 10. Read renewed deposit
  // ==========================================

  const after =
    await savingCore.getDeposit(
      depositId
    );

  const coreBalanceAfter =
    await mockUSDC.balanceOf(
      SAVING_CORE_ADDRESS
    );

  const vaultAfter =
    await vaultManager.getVaultBalance();

  console.log(
    "\n========== AFTER RENEWAL =========="
  );

  console.log(
    "Old principal:",
    ethers.formatUnits(
      before.principal,
      6
    ),
    "USDC"
  );

  console.log(
    "Interest:",
    ethers.formatUnits(
      expectedInterest,
      6
    ),
    "USDC"
  );

  console.log(
    "New principal:",
    ethers.formatUnits(
      after.principal,
      6
    ),
    "USDC"
  );

  console.log(
    "\nOld maturity:",
    before.maturityAt.toString()
  );

  console.log(
    "New maturity:",
    after.maturityAt.toString()
  );

  console.log(
    "Auto Renew:",
    after.autoRenew
  );

  console.log(
    "Status:",
    after.status.toString(),
    "(0 = ACTIVE)"
  );

  // ==========================================
  // 11. Verification
  // ==========================================

  const principalCorrect =
    after.principal ===
    expectedNewPrincipal;

  const maturityCorrect =
    after.maturityAt ===
    expectedNewMaturity;

  const statusActive =
    after.status === 0n;

  const stillAutoRenew =
    after.autoRenew === true;

  const interestAddedToCore =
    coreBalanceAfter -
      coreBalanceBefore ===
    expectedInterest;

  const vaultPaidInterest =
    vaultBefore -
      vaultAfter ===
    expectedInterest;

  console.log(
    "\n========== VERIFICATION =========="
  );

  console.log(
    "Principal increased correctly:",
    principalCorrect
  );

  console.log(
    "Maturity extended correctly:",
    maturityCorrect
  );

  console.log(
    "Deposit still ACTIVE:",
    statusActive
  );

  console.log(
    "Auto-renew still enabled:",
    stillAutoRenew
  );

  console.log(
    "Interest transferred to SavingCore:",
    interestAddedToCore
  );

  console.log(
    "Vault paid correct interest:",
    vaultPaidInterest
  );

  const success =
    principalCorrect &&
    maturityCorrect &&
    statusActive &&
    stillAutoRenew &&
    interestAddedToCore &&
    vaultPaidInterest;

  console.log(
    "\nAUTO-RENEW E2E SUCCESS:",
    success
  );

  console.log(
    "=========================================="
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});