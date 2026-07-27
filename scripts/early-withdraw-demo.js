const { ethers } = require("hardhat");

async function main() {
  const [owner, user] = await ethers.getSigners();

  // Current localhost deployment addresses
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
    "\n========== EARLY WITHDRAW E2E =========="
  );

  console.log("User:", user.address);

  // ==========================================
  // 1. Get dynamic deposit ID
  // ==========================================

  const depositId =
    await savingCore.nextDepositId();

  console.log(
    "Next Deposit ID:",
    depositId.toString()
  );

  // ==========================================
  // 2. Mint 500 USDC to user
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
    "\nMinted 500 USDC to user"
  );

  // ==========================================
  // 3. Approve SavingCore
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
  // 4. Open Deposit
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
    "\nPrincipal:",
    ethers.formatUnits(
      deposit.principal,
      6
    ),
    "USDC"
  );

  console.log(
    "Penalty BPS:",
    deposit.penaltyBpsAtOpen.toString()
  );

  // ==========================================
  // 5. Calculate expected penalty
  // ==========================================

  const expectedPenalty =
    await savingCore.calculatePenalty(
      deposit.principal,
      deposit.penaltyBpsAtOpen
    );

  const expectedReceived =
    deposit.principal -
    expectedPenalty;

  console.log(
    "\nExpected penalty:",
    ethers.formatUnits(
      expectedPenalty,
      6
    ),
    "USDC"
  );

  console.log(
    "Expected user receives:",
    ethers.formatUnits(
      expectedReceived,
      6
    ),
    "USDC"
  );

  // ==========================================
  // 6. Get Fee Receiver
  // ==========================================

  const feeReceiver =
    await vaultManager.feeReceiver();

  console.log(
    "Fee Receiver:",
    feeReceiver
  );

  // ==========================================
  // 7. Balances before early withdrawal
  // ==========================================

  const userBefore =
    await mockUSDC.balanceOf(
      user.address
    );

  const feeBefore =
    await mockUSDC.balanceOf(
      feeReceiver
    );

  const coreBefore =
    await mockUSDC.balanceOf(
      SAVING_CORE_ADDRESS
    );

  console.log(
    "\nBefore early withdrawal:"
  );

  console.log(
    "User:",
    ethers.formatUnits(
      userBefore,
      6
    ),
    "USDC"
  );

  console.log(
    "Fee Receiver:",
    ethers.formatUnits(
      feeBefore,
      6
    ),
    "USDC"
  );

  console.log(
    "SavingCore:",
    ethers.formatUnits(
      coreBefore,
      6
    ),
    "USDC"
  );

  // ==========================================
  // 8. Withdraw early
  // ==========================================

  await (
    await savingCore
      .connect(user)
      .withdrawEarly(
        depositId
      )
  ).wait();

  console.log(
    "\nEarly withdrawal successful"
  );

  // ==========================================
  // 9. Balances after withdrawal
  // ==========================================

  const userAfter =
    await mockUSDC.balanceOf(
      user.address
    );

  const feeAfter =
    await mockUSDC.balanceOf(
      feeReceiver
    );

  const coreAfter =
    await mockUSDC.balanceOf(
      SAVING_CORE_ADDRESS
    );

  const finalDeposit =
    await savingCore.getDeposit(
      depositId
    );

  // ==========================================
  // 10. Calculate actual changes
  // ==========================================

  const actualUserReceived =
    userAfter - userBefore;

  const actualFeeReceived =
    feeAfter - feeBefore;

  console.log(
    "\nAfter early withdrawal:"
  );

  console.log(
    "User:",
    ethers.formatUnits(
      userAfter,
      6
    ),
    "USDC"
  );

  console.log(
    "Fee Receiver:",
    ethers.formatUnits(
      feeAfter,
      6
    ),
    "USDC"
  );

  console.log(
    "SavingCore:",
    ethers.formatUnits(
      coreAfter,
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
  // 11. Verification
  // ==========================================

  console.log(
    "\n========== VERIFICATION =========="
  );

  console.log(
    "Original principal:",
    ethers.formatUnits(
      deposit.principal,
      6
    ),
    "USDC"
  );

  console.log(
    "Expected penalty:",
    ethers.formatUnits(
      expectedPenalty,
      6
    ),
    "USDC"
  );

  console.log(
    "User actually received:",
    ethers.formatUnits(
      actualUserReceived,
      6
    ),
    "USDC"
  );

  console.log(
    "Fee Receiver actually received:",
    ethers.formatUnits(
      actualFeeReceived,
      6
    ),
    "USDC"
  );

  console.log(
    "\nCorrect user amount:",
    actualUserReceived ===
      expectedReceived
  );

  console.log(
    "Correct penalty:",
    actualFeeReceived ===
      expectedPenalty
  );

  console.log(
    "SavingCore released principal:",
    coreBefore - coreAfter ===
      deposit.principal
  );

  console.log(
    "\n========== EARLY WITHDRAW E2E SUCCESS =========="
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});