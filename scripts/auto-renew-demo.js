const { ethers } = require("hardhat");

async function main() {
  const [owner, user] = await ethers.getSigners();

  // Read dynamic contract addresses from frontend config
  const { CONTRACT_ADDRESSES } = require("../frontend/src/config/contracts.js");

  const mockUSDC = await ethers.getContractAt(
    "MockUSDC",
    CONTRACT_ADDRESSES.mockUSDC
  );

  const vaultManager = await ethers.getContractAt(
    "VaultManager",
    CONTRACT_ADDRESSES.vaultManager
  );

  const savingCore = await ethers.getContractAt(
    "SavingCore",
    CONTRACT_ADDRESSES.savingCore
  );

  console.log("\n========== AUTO-RENEW E2E DEMO ==========");

  // 1. Fund interest vault
  const vaultFundAmount = ethers.parseUnits("100", 6);
  await (await mockUSDC.mint(owner.address, vaultFundAmount)).wait();
  await (await mockUSDC.approve(CONTRACT_ADDRESSES.vaultManager, vaultFundAmount)).wait();
  await (await vaultManager.fundVault(vaultFundAmount)).wait();
  console.log("Added 100 USDC to interest Vault");

  // 2. Find existing ACTIVE deposit (status === 0), or create one if none exist
  let depositId = -1;
  const nextId = await savingCore.nextDepositId();

  for (let i = Number(nextId) - 1; i >= 0; i--) {
    try {
      const d = await savingCore.getDeposit(i);
      if (d.status === 0n) {
        depositId = i;
        break;
      }
    } catch (e) {}
  }

  if (depositId === -1) {
    const depositAmount = ethers.parseUnits("500", 6);
    await (await mockUSDC.mint(user.address, depositAmount)).wait();
    await (await mockUSDC.connect(user).approve(CONTRACT_ADDRESSES.savingCore, depositAmount)).wait();
    await (await savingCore.connect(user).openDeposit(0, depositAmount)).wait();

    depositId = Number(await savingCore.nextDepositId()) - 1;
    console.log(`Created new Deposit ID: ${depositId}`);
  } else {
    console.log(`Using existing Active Deposit ID: ${depositId}`);
  }

  // 3. Enable Auto Renew for this deposit if not already enabled
  const depositOwnerAddress = await savingCore.ownerOf(depositId);
  let signerToUse = user;
  if (depositOwnerAddress.toLowerCase() === owner.address.toLowerCase()) {
    signerToUse = owner;
  }

  try {
    await (await savingCore.connect(signerToUse).setAutoRenew(depositId, true)).wait();
  } catch (e) {}
  console.log("Auto-renew enabled");

  const before = await savingCore.getDeposit(depositId);

  console.log("\n========== BEFORE RENEWAL ==========");
  console.log("Principal:", ethers.formatUnits(before.principal, 6), "USDC");
  console.log("Maturity:", before.maturityAt.toString());
  console.log("Auto Renew:", before.autoRenew);
  console.log("Status:", before.status.toString(), "(0 = ACTIVE)");

  // 4. Calculate expected interest
  const expectedInterest = await savingCore.calculateInterest(
    before.principal,
    before.aprBpsAtOpen,
    before.tenorDays
  );

  const expectedNewPrincipal = before.principal + expectedInterest;
  const expectedNewMaturity = before.maturityAt + BigInt(before.tenorDays) * 24n * 60n * 60n;

  console.log("\nExpected interest:", ethers.formatUnits(expectedInterest, 6), "USDC");

  // 5. Move past maturity + grace period (90 days tenor + 2 days grace = 92 days)
  const GRACE_PERIOD = await savingCore.GRACE_PERIOD();
  const latestBlock = await ethers.provider.getBlock("latest");
  const currentTimestamp = BigInt(latestBlock.timestamp);
  const targetTime = before.maturityAt + GRACE_PERIOD + 100n;

  if (currentTimestamp < targetTime) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(targetTime)]);
  }
  await ethers.provider.send("evm_mine", []);

  console.log("Blockchain moved past maturity + grace period");

  // 6. Record balances before renewal
  const coreBalanceBefore = await mockUSDC.balanceOf(CONTRACT_ADDRESSES.savingCore);
  const vaultBefore = await vaultManager.getVaultBalance();

  // 7. Process Auto Renew
  await (await savingCore.processAutoRenew(depositId)).wait();
  console.log("\nAuto-renew processed successfully");

  // 8. Read renewed deposit (new deposit is minted at nextDepositId - 1)
  const newDepositId = Number(await savingCore.nextDepositId()) - 1;
  const after = await savingCore.getDeposit(newDepositId);
  const coreBalanceAfter = await mockUSDC.balanceOf(CONTRACT_ADDRESSES.savingCore);
  const vaultAfter = await vaultManager.getVaultBalance();

  console.log("\n========== AFTER RENEWAL ==========");
  console.log("Old principal:", ethers.formatUnits(before.principal, 6), "USDC");
  console.log("Interest:", ethers.formatUnits(expectedInterest, 6), "USDC");
  console.log("New principal:", ethers.formatUnits(after.principal, 6), "USDC");
  console.log("\nOld maturity:", before.maturityAt.toString());
  console.log("New maturity:", after.maturityAt.toString());
  console.log("Auto Renew:", after.autoRenew);
  console.log("Status:", after.status.toString(), "(0 = ACTIVE)");

  // 9. Verification
  const principalCorrect = after.principal === expectedNewPrincipal;
  const maturityCorrect = after.maturityAt === expectedNewMaturity;
  const statusActive = after.status === 0n;
  const stillAutoRenew = after.autoRenew === true;
  const interestAddedToCore = coreBalanceAfter - coreBalanceBefore === expectedInterest;
  const vaultPaidInterest = vaultBefore - vaultAfter === expectedInterest;

  console.log("\n========== VERIFICATION ==========");
  console.log("Principal increased correctly:", principalCorrect);
  console.log("Maturity extended correctly:", maturityCorrect);
  console.log("Deposit still ACTIVE:", statusActive);
  console.log("Auto-renew still enabled:", stillAutoRenew);
  console.log("Interest transferred to SavingCore:", interestAddedToCore);
  console.log("Vault paid correct interest:", vaultPaidInterest);

  const success =
    principalCorrect &&
    maturityCorrect &&
    statusActive &&
    stillAutoRenew &&
    interestAddedToCore &&
    vaultPaidInterest;

  console.log("\nAUTO-RENEW E2E SUCCESS:", success);
  console.log("==========================================\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});