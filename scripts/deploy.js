const { ethers } = require("hardhat");

async function main() {
  // ==========================================
  // 1. Get deployer
  // ==========================================
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:");
  console.log(deployer.address);

  // ==========================================
  // 2. Deploy MockUSDC
  // ==========================================
  const MockUSDC =
    await ethers.getContractFactory("MockUSDC");

  const mockUSDC =
    await MockUSDC.deploy();

  await mockUSDC.waitForDeployment();

  const tokenAddress =
    await mockUSDC.getAddress();

  console.log(
    "MockUSDC deployed to:",
    tokenAddress
  );

  // ==========================================
  // 3. Deploy VaultManager
  // ==========================================

  // For local deployment:
  // deployer is used as initial fee receiver
  const VaultManager =
    await ethers.getContractFactory(
      "VaultManager"
    );

  const vaultManager =
    await VaultManager.deploy(
      tokenAddress,
      deployer.address
    );

  await vaultManager.waitForDeployment();

  const vaultManagerAddress =
    await vaultManager.getAddress();

  console.log(
    "VaultManager deployed to:",
    vaultManagerAddress
  );

  // ==========================================
  // 4. Deploy SavingCore
  // ==========================================
  const SavingCore =
    await ethers.getContractFactory(
      "SavingCore"
    );

  const savingCore =
    await SavingCore.deploy(
      tokenAddress,
      vaultManagerAddress
    );

  await savingCore.waitForDeployment();

  const savingCoreAddress =
    await savingCore.getAddress();

  console.log(
    "SavingCore deployed to:",
    savingCoreAddress
  );

  // ==========================================
  // 5. Authorize SavingCore in VaultManager
  // ==========================================
  const setSavingCoreTx =
    await vaultManager.setSavingCore(
      savingCoreAddress
    );

  await setSavingCoreTx.wait();

  console.log(
    "SavingCore authorized in VaultManager"
  );

  // ==========================================
  // 6. Create default Saving Plan
  // ==========================================

  // Personal variant:
  // Tenor: 90 days
  // APR: 200 BPS = 2%
  // Min: 100 USDC
  // Max: 10,000 USDC
  // Early withdrawal penalty:
  // 400 BPS = 4%

  const TENOR_DAYS = 90;
  const APR_BPS = 200;

  const MIN_DEPOSIT =
    ethers.parseUnits("100", 6);

  const MAX_DEPOSIT =
    ethers.parseUnits("10000", 6);

  const PENALTY_BPS = 400;

  const createPlanTx =
    await savingCore.createPlan(
      TENOR_DAYS,
      APR_BPS,
      MIN_DEPOSIT,
      MAX_DEPOSIT,
      PENALTY_BPS
    );

  await createPlanTx.wait();

  console.log(
    "Default Saving Plan created"
  );

  // ==========================================
  // 7. Verify configuration
  // ==========================================
  const configuredSavingCore =
    await vaultManager.savingCore();

  const plan =
    await savingCore.getPlan(0);

  console.log(
    "\n========== DEPLOYMENT SUMMARY =========="
  );

  console.log(
    "Deployer / Fee Receiver:",
    deployer.address
  );

  console.log(
    "MockUSDC:",
    tokenAddress
  );

  console.log(
    "VaultManager:",
    vaultManagerAddress
  );

  console.log(
    "SavingCore:",
    savingCoreAddress
  );

  console.log(
    "Authorized SavingCore:",
    configuredSavingCore
  );

  console.log("\nDefault Plan #0:");
  console.log(
    "Tenor:",
    plan.tenorDays.toString(),
    "days"
  );
  console.log(
    "APR:",
    plan.aprBps.toString(),
    "BPS"
  );
  console.log(
    "Min Deposit:",
    ethers.formatUnits(
      plan.minDeposit,
      6
    ),
    "USDC"
  );
  console.log(
    "Max Deposit:",
    ethers.formatUnits(
      plan.maxDeposit,
      6
    ),
    "USDC"
  );
  console.log(
    "Penalty:",
    plan.earlyWithdrawPenaltyBps.toString(),
    "BPS"
  );
  console.log(
    "Enabled:",
    plan.enabled
  );

  console.log(
    "========================================"
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});