const { ethers } = require("hardhat");

async function main() {
  const [owner, user] = await ethers.getSigners();

  // Addresses from localhost deployment
  const MOCK_USDC_ADDRESS =
    "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  const SAVING_CORE_ADDRESS =
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

  // Connect to deployed contracts
  const mockUSDC =
    await ethers.getContractAt(
      "MockUSDC",
      MOCK_USDC_ADDRESS
    );

  const savingCore =
    await ethers.getContractAt(
      "SavingCore",
      SAVING_CORE_ADDRESS
    );

  console.log(
    "========== E2E INTERACTION =========="
  );

  console.log("User:", user.address);

  // ------------------------------------------
  // 1. Mint 1000 MockUSDC to user
  // ------------------------------------------
  const mintAmount =
    ethers.parseUnits("1000", 6);

  let tx = await mockUSDC.mint(
    user.address,
    mintAmount
  );

  await tx.wait();

  console.log(
    "Minted 1000 MockUSDC to user"
  );

  // ------------------------------------------
  // 2. Check user balance
  // ------------------------------------------
  let balance =
    await mockUSDC.balanceOf(
      user.address
    );

  console.log(
    "User balance before deposit:",
    ethers.formatUnits(balance, 6),
    "USDC"
  );

  // ------------------------------------------
  // 3. Approve SavingCore
  // ------------------------------------------
  const depositAmount =
    ethers.parseUnits("500", 6);

  tx = await mockUSDC
    .connect(user)
    .approve(
      SAVING_CORE_ADDRESS,
      depositAmount
    );

  await tx.wait();

  console.log(
    "Approved SavingCore to spend 500 USDC"
  );

  // ------------------------------------------
  // 4. Open Deposit using Plan #0
  // ------------------------------------------
  tx = await savingCore
    .connect(user)
    .openDeposit(
      0,
      depositAmount
    );

  await tx.wait();

  console.log(
    "Opened Deposit #0 with 500 USDC"
  );

  // ------------------------------------------
  // 5. Read Deposit #0
  // ------------------------------------------
  const deposit =
    await savingCore.getDeposit(0);

  console.log("\nDeposit #0:");

  console.log(
    "Principal:",
    ethers.formatUnits(
      deposit.principal,
      6
    ),
    "USDC"
  );

  console.log(
    "Plan ID:",
    deposit.planId.toString()
  );

  console.log(
    "Tenor:",
    deposit.tenorDays.toString(),
    "days"
  );

  console.log(
    "APR:",
    deposit.aprBpsAtOpen.toString(),
    "BPS"
  );

  console.log(
    "Auto Renew:",
    deposit.autoRenew
  );

  // ------------------------------------------
  // 6. Verify NFT certificate
  // ------------------------------------------
  const nftOwner =
    await savingCore.ownerOf(0);

  console.log(
    "\nNFT Certificate #0 owner:",
    nftOwner
  );

  console.log(
    "NFT belongs to user:",
    nftOwner.toLowerCase() ===
      user.address.toLowerCase()
  );

  // ------------------------------------------
  // 7. Check balances after deposit
  // ------------------------------------------
  balance =
    await mockUSDC.balanceOf(
      user.address
    );

  const savingCoreBalance =
    await mockUSDC.balanceOf(
      SAVING_CORE_ADDRESS
    );

  console.log(
    "\nUser balance after deposit:",
    ethers.formatUnits(balance, 6),
    "USDC"
  );

  console.log(
    "SavingCore balance:",
    ethers.formatUnits(
      savingCoreBalance,
      6
    ),
    "USDC"
  );

  console.log(
    "\n========== E2E SUCCESS =========="
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});