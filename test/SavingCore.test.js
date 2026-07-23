const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SavingCore", function () {
  let savingCore;
  let mockUSDC;
  let owner;
  let user;

  const TENOR_DAYS = 90;
  const APR_BPS = 200;
  const PENALTY_BPS = 400;

  const MIN_DEPOSIT = 100_000000;
  const MAX_DEPOSIT = 10_000_000000;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy MockUSDC
    const MockUSDC =
      await ethers.getContractFactory("MockUSDC");

    mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();

    // Deploy VaultManager
    const VaultManager =
      await ethers.getContractFactory("VaultManager");

    vaultManager = await VaultManager.deploy(
      await mockUSDC.getAddress(),
      owner.address
    );

    await vaultManager.waitForDeployment();

    // Deploy SavingCore
    const SavingCore =
      await ethers.getContractFactory("SavingCore");

    savingCore = await SavingCore.deploy(
      await mockUSDC.getAddress(),
      await vaultManager.getAddress()
    );

    await savingCore.waitForDeployment();

    // Authorize SavingCore to request interest payouts
    await vaultManager.setSavingCore(
      await savingCore.getAddress()
    );
  });
  it("should use the correct personal variant values", async function () {
    expect(await savingCore.GRACE_PERIOD())
      .to.equal(2 * 24 * 60 * 60);

    expect(await savingCore.DEFAULT_APR_BPS())
      .to.equal(200);

    expect(await savingCore.DEFAULT_PENALTY_BPS())
      .to.equal(400);

    expect(await savingCore.DEFAULT_TENOR_DAYS())
      .to.equal(90);
  });

  it("should allow owner to create a saving plan", async function () {
    await savingCore.createPlan(
      TENOR_DAYS,
      APR_BPS,
      MIN_DEPOSIT,
      MAX_DEPOSIT,
      PENALTY_BPS
    );

    const plan = await savingCore.getPlan(0);

    expect(plan.tenorDays).to.equal(TENOR_DAYS);
    expect(plan.aprBps).to.equal(APR_BPS);

    expect(plan.minDeposit)
      .to.equal(MIN_DEPOSIT);

    expect(plan.maxDeposit)
      .to.equal(MAX_DEPOSIT);

    expect(plan.earlyWithdrawPenaltyBps)
      .to.equal(PENALTY_BPS);

    expect(plan.enabled).to.equal(true);
  });

  it("should allow zero min and max deposit limits", async function () {
    await savingCore.createPlan(
      TENOR_DAYS,
      APR_BPS,
      0,
      0,
      PENALTY_BPS
    );

    const plan = await savingCore.getPlan(0);

    expect(plan.minDeposit).to.equal(0);
    expect(plan.maxDeposit).to.equal(0);
  });

  it("should reject invalid deposit limits", async function () {
    await expect(
      savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MAX_DEPOSIT,
        MIN_DEPOSIT,
        PENALTY_BPS
      )
    ).to.be.revertedWith(
      "Invalid deposit limits"
    );
  });

  it("should reject plan creation from non-owner", async function () {
    await expect(
      savingCore.connect(user).createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      )
    ).to.be.reverted;
  });

  it("should allow owner to update plan APR", async function () {
    await savingCore.createPlan(
      TENOR_DAYS,
      APR_BPS,
      MIN_DEPOSIT,
      MAX_DEPOSIT,
      PENALTY_BPS
    );

    await savingCore.updatePlan(
      0,
      300
    );

    const plan = await savingCore.getPlan(0);

    expect(plan.aprBps).to.equal(300);
  });

  it("should allow owner to disable a plan", async function () {
    await savingCore.createPlan(
      TENOR_DAYS,
      APR_BPS,
      MIN_DEPOSIT,
      MAX_DEPOSIT,
      PENALTY_BPS
    );

    await savingCore.disablePlan(0);

    const plan = await savingCore.getPlan(0);

    expect(plan.enabled).to.equal(false);
  });

  it("should allow owner to enable a plan", async function () {
    await savingCore.createPlan(
      TENOR_DAYS,
      APR_BPS,
      MIN_DEPOSIT,
      MAX_DEPOSIT,
      PENALTY_BPS
    );

    await savingCore.disablePlan(0);
    await savingCore.enablePlan(0);

    const plan = await savingCore.getPlan(0);

    expect(plan.enabled).to.equal(true);
  });

  it("should reject zero tenor", async function () {
    await expect(
      savingCore.createPlan(
        0,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      )
    ).to.be.revertedWith(
      "Invalid tenor"
    );
  });

  it("should reject APR greater than 100 percent", async function () {
    await expect(
      savingCore.createPlan(
        TENOR_DAYS,
        10001,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      )
    ).to.be.revertedWith(
      "Invalid APR"
    );
  });

  it("should reject penalty greater than 100 percent", async function () {
    await expect(
      savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        10001
      )
    ).to.be.revertedWith(
      "Invalid penalty"
    );
  });

  it("should reject access to a plan that does not exist", async function () {
    await expect(
      savingCore.getPlan(999)
    ).to.be.revertedWith(
      "Plan does not exist"
    );
  });

  it("should calculate interest correctly", async function () {
    const principal = ethers.parseUnits("1000", 6);

    const expectedInterest =
      (principal *
        BigInt(APR_BPS) *
        BigInt(TENOR_DAYS)) /
      (10000n * 365n);

    const interest =
      await savingCore.calculateInterest(
        principal,
        APR_BPS,
        TENOR_DAYS
      );

    expect(interest).to.equal(expectedInterest);
    async function createManualRenewDeposit() {
      const amount = ethers.parseUnits("500", 6);

      await mockUSDC.mint(user.address, amount);

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          amount
        );

      const depositId =
        await savingCore.nextDepositId();

      await savingCore
        .connect(user)
        .openDeposit(0, amount);

      return {
        depositId,
        amount
      };
    }

  });

  describe("Open Deposit", function () {
    it("should allow a user to open a deposit", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      // Create saving plan
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      // Give user 1000 MockUSDC
      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      // Allow SavingCore to transfer user's USDC
      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      // Open deposit
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      // Read created deposit
      const deposit = await savingCore.getDeposit(0);

      expect(deposit.principal)
        .to.equal(depositAmount);

      expect(deposit.planId)
        .to.equal(0);

      expect(deposit.tenorDays)
        .to.equal(TENOR_DAYS);

      expect(deposit.aprBpsAtOpen)
        .to.equal(APR_BPS);

      expect(deposit.penaltyBpsAtOpen)
        .to.equal(PENALTY_BPS);

      // ACTIVE = 0
      expect(deposit.status)
        .to.equal(0);

      // Deposit #0 created, next ID should be 1
      expect(await savingCore.nextDepositId())
        .to.equal(1);

      // SavingCore should receive user's USDC
      expect(
        await mockUSDC.balanceOf(
          await savingCore.getAddress()
        )
      ).to.equal(depositAmount);
    });

    // TEST 2 - THÊM MỚI
    it("should reject a deposit below the minimum amount", async function () {
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      const belowMinimum = ethers.parseUnits("99", 6);

      await expect(
        savingCore
          .connect(user)
          .openDeposit(0, belowMinimum)
      ).to.be.revertedWith("Below minimum deposit");
    });


    // TEST 3 - THÊM MỚI
    it("should reject a deposit above the maximum amount", async function () {
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      const aboveMaximum = ethers.parseUnits("10001", 6);

      await expect(
        savingCore
          .connect(user)
          .openDeposit(0, aboveMaximum)
      ).to.be.revertedWith("Above maximum deposit");
    });


    // TEST 4 - THÊM MỚI
    it("should reject a zero deposit amount", async function () {
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      await expect(
        savingCore
          .connect(user)
          .openDeposit(0, 0)
      ).to.be.revertedWith(
        "Amount must be greater than zero"
      );
    });


    // TEST 5 - THÊM MỚI
    it("should reject deposits into a disabled plan", async function () {
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      await savingCore.disablePlan(0);

      const depositAmount = ethers.parseUnits("1000", 6);

      await expect(
        savingCore
          .connect(user)
          .openDeposit(0, depositAmount)
      ).to.be.revertedWith("Plan is disabled");
    });


    // TEST 6 - THÊM MỚI
    it("should reject deposits into a plan that does not exist", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      await expect(
        savingCore
          .connect(user)
          .openDeposit(999, depositAmount)
      ).to.be.revertedWith("Plan does not exist");
    });
    it("should keep the original APR after the plan APR is updated", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      // Create plan with APR = 200 BPS
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      // Give user USDC
      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      // Approve SavingCore
      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      // Open deposit when APR = 200 BPS
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      // Admin changes plan APR from 200 to 500 BPS
      await savingCore.updatePlan(
        0,
        500
      );

      const plan = await savingCore.getPlan(0);
      const deposit = await savingCore.getDeposit(0);

      // Current plan should use new APR
      expect(plan.aprBps).to.equal(500);

      // Existing deposit must keep original APR
      expect(deposit.aprBpsAtOpen).to.equal(APR_BPS);
    });
    it("should calculate the correct maturity time", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      const deposit = await savingCore.getDeposit(0);

      const expectedDuration =
        BigInt(TENOR_DAYS * 24 * 60 * 60);

      expect(
        deposit.maturityAt - deposit.openedAt
      ).to.equal(expectedDuration);
    });

    it("should allow the deposit NFT to be transferred", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      await savingCore
        .connect(user)
        .openDeposit(0, depositAmount);

      const [, , newOwner] = await ethers.getSigners();

      await savingCore
        .connect(user)
        .transferFrom(
          user.address,
          newOwner.address,
          0
        );

      expect(
        await savingCore.ownerOf(0)
      ).to.equal(newOwner.address);
    });
  });
  describe("Mature Withdrawal", function () {
    it("should allow the NFT owner to withdraw principal and interest at maturity", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      const vaultFundAmount = ethers.parseUnits("100", 6);

      // Create saving plan
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      // Give user funds for deposit
      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      // Open deposit
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      // Fund VaultManager for interest payments
      await mockUSDC.mint(
        owner.address,
        vaultFundAmount
      );

      await mockUSDC.approve(
        await vaultManager.getAddress(),
        vaultFundAmount
      );

      await vaultManager.fundVault(
        vaultFundAmount
      );

      const deposit =
        await savingCore.getDeposit(0);

      const expectedInterest =
        await savingCore.calculateInterest(
          deposit.principal,
          deposit.aprBpsAtOpen,
          deposit.tenorDays
        );

      // Move blockchain time to maturity
      await ethers.provider.send(
        "evm_setNextBlockTimestamp",
        [Number(deposit.maturityAt)]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      // User withdraws at maturity
      await savingCore
        .connect(user)
        .withdrawAtMaturity(0);

      // User should receive principal + interest
      expect(
        await mockUSDC.balanceOf(user.address)
      ).to.equal(
        depositAmount + expectedInterest
      );

      // Deposit should now be CLOSED
      const closedDeposit =
        await savingCore.getDeposit(0);

      expect(
        closedDeposit.status
      ).to.equal(1);
    });
    it("should manually renew a matured deposit", async function () {
      // Create a new saving plan
      await savingCore.createPlan(
        90,
        200,
        0,
        0,
        400
      );

      const amount =
        ethers.parseUnits("500", 6);

      // Give user USDC
      await mockUSDC.mint(
        user.address,
        amount
      );

      // Approve SavingCore
      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          amount
        );

      // Get actual deposit ID
      const depositId =
        await savingCore.nextDepositId();

      // Open deposit
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          amount
        );

      // Fund VaultManager for interest
      const vaultFund =
        ethers.parseUnits("1000", 6);

      await mockUSDC.mint(
        owner.address,
        vaultFund
      );

      await mockUSDC.approve(
        await vaultManager.getAddress(),
        vaultFund
      );

      await vaultManager.fundVault(
        vaultFund
      );

      // Read original deposit
      const oldDeposit =
        await savingCore.getDeposit(
          depositId
        );

      const expectedInterest =
        await savingCore.calculateInterest(
          oldDeposit.principal,
          oldDeposit.aprBpsAtOpen,
          oldDeposit.tenorDays
        );

      // Move blockchain past maturity
      await ethers.provider.send(
        "evm_increaseTime",
        [
          Number(oldDeposit.tenorDays) *
          24 * 60 * 60 +
          1
        ]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      // ID that the new deposit should receive
      const newDepositId =
        await savingCore.nextDepositId();

      // Manual Renew
      await savingCore
        .connect(user)
        .renewDeposit(
          depositId,
          0
        );

      // Read old and new deposits
      const renewedOldDeposit =
        await savingCore.getDeposit(
          depositId
        );

      const newDeposit =
        await savingCore.getDeposit(
          newDepositId
        );

      // Old deposit -> MANUAL_RENEWED = 2
      expect(
        renewedOldDeposit.status
      ).to.equal(2n);

      // Auto Renew should be OFF
      expect(
        renewedOldDeposit.autoRenew
      ).to.equal(false);

      // New principal = old principal + interest
      expect(
        newDeposit.principal
      ).to.equal(
        amount + expectedInterest
      );

      // New deposit -> ACTIVE = 0
      expect(
        newDeposit.status
      ).to.equal(0n);

      // New NFT belongs to user
      expect(
        await savingCore.ownerOf(
          newDepositId
        )
      ).to.equal(user.address);

      // A new deposit was actually created
      expect(
        await savingCore.nextDepositId()
      ).to.equal(
        newDepositId + 1n
      );
    });
    it("should reject withdrawal before maturity", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      await expect(
        savingCore
          .connect(user)
          .withdrawAtMaturity(0)
      ).to.be.revertedWith(
        "Deposit has not matured"
      );
    });
    it("should reject withdrawal from a non-NFT owner", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);

      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      // User opens Deposit #0 and owns NFT #0
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      const deposit =
        await savingCore.getDeposit(0);

      // Move time to maturity
      await ethers.provider.send(
        "evm_setNextBlockTimestamp",
        [Number(deposit.maturityAt)]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      // Owner/admin does NOT own NFT #0
      await expect(
        savingCore
          .connect(owner)
          .withdrawAtMaturity(0)
      ).to.be.revertedWith(
        "Not deposit owner"
      );
    });
    it("should allow the new NFT owner to withdraw after transfer", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      const vaultFundAmount = ethers.parseUnits("100", 6);

      const [, , newOwner] = await ethers.getSigners();

      // Create saving plan
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      // Give user funds
      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      // User opens Deposit #0
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      // Transfer NFT #0 from original depositor to new owner
      await savingCore
        .connect(user)
        .transferFrom(
          user.address,
          newOwner.address,
          0
        );

      expect(
        await savingCore.ownerOf(0)
      ).to.equal(newOwner.address);

      // Fund VaultManager for interest
      await mockUSDC.mint(
        owner.address,
        vaultFundAmount
      );

      await mockUSDC.approve(
        await vaultManager.getAddress(),
        vaultFundAmount
      );

      await vaultManager.fundVault(
        vaultFundAmount
      );

      const deposit =
        await savingCore.getDeposit(0);

      const expectedInterest =
        await savingCore.calculateInterest(
          deposit.principal,
          deposit.aprBpsAtOpen,
          deposit.tenorDays
        );

      // Move to maturity
      await ethers.provider.send(
        "evm_setNextBlockTimestamp",
        [Number(deposit.maturityAt)]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      // NEW NFT owner withdraws
      await savingCore
        .connect(newOwner)
        .withdrawAtMaturity(0);

      // New owner receives principal + interest
      expect(
        await mockUSDC.balanceOf(newOwner.address)
      ).to.equal(
        depositAmount + expectedInterest
      );

      const closedDeposit =
        await savingCore.getDeposit(0);

      expect(
        closedDeposit.status
      ).to.equal(1);
    });
    it("should reject withdrawing the same deposit twice", async function () {
      const depositAmount = ethers.parseUnits("1000", 6);
      const vaultFundAmount = ethers.parseUnits("100", 6);

      // Create saving plan
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      // Give user funds
      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      // Open Deposit #0
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      // Fund VaultManager for interest
      await mockUSDC.mint(
        owner.address,
        vaultFundAmount
      );

      await mockUSDC.approve(
        await vaultManager.getAddress(),
        vaultFundAmount
      );

      await vaultManager.fundVault(
        vaultFundAmount
      );

      const deposit =
        await savingCore.getDeposit(0);

      // Move to maturity
      await ethers.provider.send(
        "evm_setNextBlockTimestamp",
        [Number(deposit.maturityAt)]
      );

      await ethers.provider.send(
        "evm_mine",
        []
      );

      // First withdrawal succeeds
      await savingCore
        .connect(user)
        .withdrawAtMaturity(0);

      // Deposit is now CLOSED
      const closedDeposit =
        await savingCore.getDeposit(0);

      expect(
        closedDeposit.status
      ).to.equal(1);

      // Second withdrawal must fail
      await expect(
        savingCore
          .connect(user)
          .withdrawAtMaturity(0)
      ).to.be.revertedWith(
        "Deposit is not active"
      );
    });
    describe("Penalty Calculation", function () {

      it("should calculate the correct early withdrawal penalty", async function () {
        const principal =
          ethers.parseUnits("1000", 6);

        const penalty =
          await savingCore.calculatePenalty(
            principal,
            PENALTY_BPS
          );

        const expectedPenalty =
          ethers.parseUnits("40", 6);

        expect(
          penalty
        ).to.equal(
          expectedPenalty
        );
      });

    });
    describe("Early Withdrawal", function () {

      it("should allow NFT owner to withdraw early with penalty", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        const expectedPenalty =
          ethers.parseUnits("40", 6);

        const expectedReceived =
          ethers.parseUnits("960", 6);

        // Create plan: 2% APR, 4% early withdrawal penalty
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give user 1,000 USDC
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // User opens deposit
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // User now has 0 because 1,000 is held by SavingCore
        expect(
          await mockUSDC.balanceOf(user.address)
        ).to.equal(0);

        // Get fee receiver before withdrawal
        const feeReceiver =
          await vaultManager.feeReceiver();

        const feeBalanceBefore =
          await mockUSDC.balanceOf(
            feeReceiver
          );

        // Withdraw before maturity
        await savingCore
          .connect(user)
          .withdrawEarly(0);

        // User receives 960 USDC
        expect(
          await mockUSDC.balanceOf(user.address)
        ).to.equal(
          expectedReceived
        );

        // Fee receiver receives 40 USDC penalty
        const feeBalanceAfter =
          await mockUSDC.balanceOf(
            feeReceiver
          );

        expect(
          feeBalanceAfter - feeBalanceBefore
        ).to.equal(
          expectedPenalty
        );

        // Deposit must be CLOSED
        const deposit =
          await savingCore.getDeposit(0);

        expect(
          deposit.status
        ).to.equal(1);
      });
      it("should preserve the penalty snapshot after the deposit is opened", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        // Create plan with 4% penalty
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open deposit
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        const depositBefore =
          await savingCore.getDeposit(0);

        expect(
          depositBefore.penaltyBpsAtOpen
        ).to.equal(
          PENALTY_BPS
        );

        // Admin changes the plan APR later
        await savingCore.updatePlan(
          0,
          500
        );

        const plan =
          await savingCore.getPlan(0);

        expect(
          plan.aprBps
        ).to.equal(500);

        // Existing deposit keeps its original penalty snapshot
        const depositAfter =
          await savingCore.getDeposit(0);

        expect(
          depositAfter.penaltyBpsAtOpen
        ).to.equal(
          PENALTY_BPS
        );
      });
      it("should reject early withdrawal from a non-NFT owner", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        // Create saving plan
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give user funds
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // User opens Deposit #0
        // => User owns NFT #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Contract owner/admin does NOT own NFT #0
        await expect(
          savingCore
            .connect(owner)
            .withdrawEarly(0)
        ).to.be.revertedWith(
          "Not deposit owner"
        );
      });
      it("should reject early withdrawal after maturity", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        // Create saving plan
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give user funds
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open Deposit #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        const deposit =
          await savingCore.getDeposit(0);

        // Move blockchain time exactly to maturity
        await ethers.provider.send(
          "evm_setNextBlockTimestamp",
          [Number(deposit.maturityAt)]
        );

        await ethers.provider.send(
          "evm_mine",
          []
        );

        // Early withdrawal is no longer allowed
        await expect(
          savingCore
            .connect(user)
            .withdrawEarly(0)
        ).to.be.revertedWith(
          "Deposit already matured"
        );
      });
      it("should reject withdrawing early twice", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        // Create saving plan
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give user funds
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open Deposit #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // First early withdrawal succeeds
        await savingCore
          .connect(user)
          .withdrawEarly(0);

        // Deposit should now be CLOSED
        const deposit =
          await savingCore.getDeposit(0);

        expect(
          deposit.status
        ).to.equal(1);

        // Second withdrawal must fail
        await expect(
          savingCore
            .connect(user)
            .withdrawEarly(0)
        ).to.be.revertedWith(
          "Deposit is not active"
        );
      });
      it("should allow the new NFT owner to withdraw early after transfer", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        const expectedPenalty =
          ethers.parseUnits("40", 6);

        const expectedReceived =
          ethers.parseUnits("960", 6);

        const [, , newOwner] =
          await ethers.getSigners();

        // Create saving plan
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give original user funds
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // User opens Deposit #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Transfer NFT #0 to new owner
        await savingCore
          .connect(user)
          .transferFrom(
            user.address,
            newOwner.address,
            0
          );

        expect(
          await savingCore.ownerOf(0)
        ).to.equal(
          newOwner.address
        );

        const feeReceiver =
          await vaultManager.feeReceiver();

        const feeBalanceBefore =
          await mockUSDC.balanceOf(
            feeReceiver
          );

        // New NFT owner performs early withdrawal
        await savingCore
          .connect(newOwner)
          .withdrawEarly(0);

        // New owner receives principal minus penalty
        expect(
          await mockUSDC.balanceOf(
            newOwner.address
          )
        ).to.equal(
          expectedReceived
        );

        // Fee receiver gets 4% penalty
        const feeBalanceAfter =
          await mockUSDC.balanceOf(
            feeReceiver
          );

        expect(
          feeBalanceAfter - feeBalanceBefore
        ).to.equal(
          expectedPenalty
        );

        // Deposit is CLOSED
        const deposit =
          await savingCore.getDeposit(0);

        expect(
          deposit.status
        ).to.equal(1);
      });
      describe("Auto Renew Configuration", function () {

        it("should allow NFT owner to enable auto-renew", async function () {
          const depositAmount =
            ethers.parseUnits("1000", 6);

          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          await mockUSDC.mint(
            user.address,
            depositAmount
          );

          await mockUSDC
            .connect(user)
            .approve(
              await savingCore.getAddress(),
              depositAmount
            );

          await savingCore
            .connect(user)
            .openDeposit(
              0,
              depositAmount
            );

          // Default must be false
          let deposit =
            await savingCore.getDeposit(0);

          expect(
            deposit.autoRenew
          ).to.equal(false);

          // Enable auto-renew
          await savingCore
            .connect(user)
            .setAutoRenew(
              0,
              true
            );

          deposit =
            await savingCore.getDeposit(0);

          expect(
            deposit.autoRenew
          ).to.equal(true);
        });
        it("should reject auto-renew when the renewal window has been missed", async function () {
          const depositAmount =
            ethers.parseUnits("1000", 6);

          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          await mockUSDC.mint(
            user.address,
            depositAmount
          );

          await mockUSDC
            .connect(user)
            .approve(
              await savingCore.getAddress(),
              depositAmount
            );

          await savingCore
            .connect(user)
            .openDeposit(
              0,
              depositAmount
            );

          await savingCore
            .connect(user)
            .setAutoRenew(
              0,
              true
            );

          const deposit =
            await savingCore.getDeposit(0);

          const gracePeriod =
            2 * 24 * 60 * 60;

          const tenor =
            TENOR_DAYS * 24 * 60 * 60;

          // Move exactly to the end of the allowed renewal window
          await ethers.provider.send(
            "evm_setNextBlockTimestamp",
            [
              Number(deposit.maturityAt) +
              gracePeriod +
              tenor
            ]
          );

          await ethers.provider.send(
            "evm_mine",
            []
          );

          await expect(
            savingCore.processAutoRenew(0)
          ).to.be.revertedWith(
            "Renewal window missed"
          );
        });

        it("should allow NFT owner to disable auto-renew", async function () {
          const depositAmount =
            ethers.parseUnits("1000", 6);

          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          await mockUSDC.mint(
            user.address,
            depositAmount
          );

          await mockUSDC
            .connect(user)
            .approve(
              await savingCore.getAddress(),
              depositAmount
            );

          await savingCore
            .connect(user)
            .openDeposit(
              0,
              depositAmount
            );

          // Enable first
          await savingCore
            .connect(user)
            .setAutoRenew(
              0,
              true
            );

          // Then disable
          await savingCore
            .connect(user)
            .setAutoRenew(
              0,
              false
            );

          const deposit =
            await savingCore.getDeposit(0);

          expect(
            deposit.autoRenew
          ).to.equal(false);
        });

      });
      it("should reject auto-renew update from a non-NFT owner", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // User opens Deposit #0
        // => NFT #0 belongs to user
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Owner/admin does not own NFT #0
        await expect(
          savingCore
            .connect(owner)
            .setAutoRenew(
              0,
              true
            )
        ).to.be.revertedWith(
          "Not deposit owner"
        );
      });
      it("should auto-renew after the grace period and compound interest", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        const vaultFundAmount =
          ethers.parseUnits("100", 6);

        // Create saving plan
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give user 1,000 USDC
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open Deposit #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Enable auto-renew
        await savingCore
          .connect(user)
          .setAutoRenew(
            0,
            true
          );

        // Fund VaultManager so it can provide interest
        await mockUSDC.mint(
          owner.address,
          vaultFundAmount
        );

        await mockUSDC.approve(
          await vaultManager.getAddress(),
          vaultFundAmount
        );

        await vaultManager.fundVault(
          vaultFundAmount
        );

        const depositBefore =
          await savingCore.getDeposit(0);

        const expectedInterest =
          await savingCore.calculateInterest(
            depositBefore.principal,
            depositBefore.aprBpsAtOpen,
            depositBefore.tenorDays
          );

        // Move time to:
        // maturity + 2-day grace period
        await ethers.provider.send(
          "evm_setNextBlockTimestamp",
          [
            Number(depositBefore.maturityAt) +
            (2 * 24 * 60 * 60)
          ]
        );

        await ethers.provider.send(
          "evm_mine",
          []
        );

        // Process auto-renew
        await savingCore.processAutoRenew(0);

        const depositAfter =
          await savingCore.getDeposit(0);

        // Interest is compounded into principal
        expect(
          depositAfter.principal
        ).to.equal(
          depositAmount + expectedInterest
        );

        // New maturity = old maturity + 90 days
        expect(
          depositAfter.maturityAt
        ).to.equal(
          depositBefore.maturityAt +
          BigInt(TENOR_DAYS * 24 * 60 * 60)
        );

        // Deposit remains active
        expect(
          depositAfter.status
        ).to.equal(0);

        // Auto-renew remains enabled
        expect(
          depositAfter.autoRenew
        ).to.equal(true);

        // NFT ownership remains unchanged
        expect(
          await savingCore.ownerOf(0)
        ).to.equal(
          user.address
        );

        // SavingCore must actually hold
        // principal + compounded interest
        expect(
          await mockUSDC.balanceOf(
            await savingCore.getAddress()
          )
        ).to.equal(
          depositAmount + expectedInterest
        );
      });
      it("should reject auto-renew before the grace period ends", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open Deposit #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Enable auto-renew
        await savingCore
          .connect(user)
          .setAutoRenew(
            0,
            true
          );

        const deposit =
          await savingCore.getDeposit(0);

        // Move to maturity + 1 day
        // Grace period is 2 days, so this is still too early
        await ethers.provider.send(
          "evm_setNextBlockTimestamp",
          [
            Number(deposit.maturityAt) +
            (1 * 24 * 60 * 60)
          ]
        );

        await ethers.provider.send(
          "evm_mine",
          []
        );

        await expect(
          savingCore.processAutoRenew(0)
        ).to.be.revertedWith(
          "Grace period not ended"
        );
      });
      it("should allow withdrawal during the grace period even when auto-renew is enabled", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        const vaultFundAmount =
          ethers.parseUnits("100", 6);

        // Create plan
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give user funds
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open Deposit #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Enable auto-renew
        await savingCore
          .connect(user)
          .setAutoRenew(
            0,
            true
          );

        // Fund VaultManager for interest payment
        await mockUSDC.mint(
          owner.address,
          vaultFundAmount
        );

        await mockUSDC.approve(
          await vaultManager.getAddress(),
          vaultFundAmount
        );

        await vaultManager.fundVault(
          vaultFundAmount
        );

        const depositBefore =
          await savingCore.getDeposit(0);

        const expectedInterest =
          await savingCore.calculateInterest(
            depositBefore.principal,
            depositBefore.aprBpsAtOpen,
            depositBefore.tenorDays
          );

        // Move to maturity + 1 day
        // This is INSIDE the 2-day grace period
        await ethers.provider.send(
          "evm_setNextBlockTimestamp",
          [
            Number(depositBefore.maturityAt) +
            (1 * 24 * 60 * 60)
          ]
        );

        await ethers.provider.send(
          "evm_mine",
          []
        );

        // User chooses to withdraw instead of renewing
        await savingCore
          .connect(user)
          .withdrawAtMaturity(0);

        // User receives principal + interest
        expect(
          await mockUSDC.balanceOf(
            user.address
          )
        ).to.equal(
          depositAmount + expectedInterest
        );

        // Deposit is CLOSED
        const depositAfter =
          await savingCore.getDeposit(0);

        expect(
          depositAfter.status
        ).to.equal(1);
      });
      it("should not allow immediate withdrawal after auto-renew creates a new term", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        const vaultFundAmount =
          ethers.parseUnits("100", 6);

        // Create plan
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        // Give user funds
        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open Deposit #0
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Enable auto-renew
        await savingCore
          .connect(user)
          .setAutoRenew(
            0,
            true
          );

        // Fund VaultManager for interest
        await mockUSDC.mint(
          owner.address,
          vaultFundAmount
        );

        await mockUSDC.approve(
          await vaultManager.getAddress(),
          vaultFundAmount
        );

        await vaultManager.fundVault(
          vaultFundAmount
        );

        const depositBefore =
          await savingCore.getDeposit(0);

        // Move to old maturity + 2-day grace period
        await ethers.provider.send(
          "evm_setNextBlockTimestamp",
          [
            Number(depositBefore.maturityAt) +
            (2 * 24 * 60 * 60)
          ]
        );

        await ethers.provider.send(
          "evm_mine",
          []
        );

        // Renew into a new term
        await savingCore.processAutoRenew(0);

        const depositAfter =
          await savingCore.getDeposit(0);

        // New maturity must be later than current blockchain time
        const latestBlock =
          await ethers.provider.getBlock(
            "latest"
          );

        expect(
          depositAfter.maturityAt
        ).to.be.greaterThan(
          latestBlock.timestamp
        );

        // Cannot immediately perform mature withdrawal
        await expect(
          savingCore
            .connect(user)
            .withdrawAtMaturity(0)
        ).to.be.revertedWith(
          "Deposit has not matured"
        );
      });
      it("should reject auto-renew processing when auto-renew is disabled", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        // Open Deposit #0
        // autoRenew is false by default
        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        const deposit =
          await savingCore.getDeposit(0);

        expect(
          deposit.autoRenew
        ).to.equal(false);

        // Move past maturity + grace period
        await ethers.provider.send(
          "evm_setNextBlockTimestamp",
          [
            Number(deposit.maturityAt) +
            (2 * 24 * 60 * 60)
          ]
        );

        await ethers.provider.send(
          "evm_mine",
          []
        );

        // Must not renew because user never enabled it
        await expect(
          savingCore.processAutoRenew(0)
        ).to.be.revertedWith(
          "Auto-renew is disabled"
        );
      });
      it("should reject changing auto-renew after the grace period ends", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        const deposit =
          await savingCore.getDeposit(0);

        // Move exactly to maturity + 2-day grace period
        await ethers.provider.send(
          "evm_setNextBlockTimestamp",
          [
            Number(deposit.maturityAt) +
            (2 * 24 * 60 * 60)
          ]
        );

        await ethers.provider.send(
          "evm_mine",
          []
        );

        await expect(
          savingCore
            .connect(user)
            .setAutoRenew(
              0,
              true
            )
        ).to.be.revertedWith(
          "Auto-renew configuration period ended"
        );
      });
    });
    describe("Constructor Validation", function () {

      it("should reject zero token address", async function () {
        const SavingCore =
          await ethers.getContractFactory(
            "SavingCore"
          );

        await expect(
          SavingCore.deploy(
            ethers.ZeroAddress,
            await vaultManager.getAddress()
          )
        ).to.be.revertedWith(
          "Invalid token address"
        );
      });

      it("should reject zero VaultManager address", async function () {
        const SavingCore =
          await ethers.getContractFactory(
            "SavingCore"
          );

        await expect(
          SavingCore.deploy(
            await mockUSDC.getAddress(),
            ethers.ZeroAddress
          )
        ).to.be.revertedWith(
          "Invalid VaultManager address"
        );
      });

    });
    describe("Plan Management Edge Cases", function () {

      it("should reject updating a plan that does not exist", async function () {
        await expect(
          savingCore.updatePlan(
            999,
            300
          )
        ).to.be.revertedWith(
          "Plan does not exist"
        );
      });

      it("should reject updating plan APR above 100 percent", async function () {
        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        await expect(
          savingCore.updatePlan(
            0,
            10001
          )
        ).to.be.revertedWith(
          "Invalid APR"
        );
      });

      it("should reject enabling a plan that does not exist", async function () {
        await expect(
          savingCore.enablePlan(
            999
          )
        ).to.be.revertedWith(
          "Plan does not exist"
        );
      });

      it("should reject disabling a plan that does not exist", async function () {
        await expect(
          savingCore.disablePlan(
            999
          )
        ).to.be.revertedWith(
          "Plan does not exist"
        );
      });

    });
  }); describe("Auto Renew Edge Cases", function () {

    it("should reject setting auto-renew for a deposit that does not exist", async function () {
      await expect(
        savingCore.setAutoRenew(
          999,
          true
        )
      ).to.be.revertedWith(
        "Deposit does not exist"
      );
    });


    it("should reject processing auto-renew for a deposit that does not exist", async function () {
      await expect(
        savingCore.processAutoRenew(
          999
        )
      ).to.be.revertedWith(
        "Deposit does not exist"
      );
    });


    it("should reject setting auto-renew on a closed deposit", async function () {
      const depositAmount =
        ethers.parseUnits("1000", 6);

      // Create plan
      await savingCore.createPlan(
        TENOR_DAYS,
        APR_BPS,
        MIN_DEPOSIT,
        MAX_DEPOSIT,
        PENALTY_BPS
      );

      // Give user tokens
      await mockUSDC.mint(
        user.address,
        depositAmount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          depositAmount
        );

      // Open Deposit #0
      await savingCore
        .connect(user)
        .openDeposit(
          0,
          depositAmount
        );

      // Close it using early withdrawal
      await savingCore
        .connect(user)
        .withdrawEarly(0);

      // Deposit is now CLOSED
      await expect(
        savingCore
          .connect(user)
          .setAutoRenew(
            0,
            true
          )
      ).to.be.revertedWith(
        "Deposit is not active"
      );
    });
    describe("Deposit Closed State Edge Cases", function () {

      it("should reject auto-renew processing for a closed deposit", async function () {
        const depositAmount =
          ethers.parseUnits("1000", 6);

        await savingCore.createPlan(
          TENOR_DAYS,
          APR_BPS,
          MIN_DEPOSIT,
          MAX_DEPOSIT,
          PENALTY_BPS
        );

        await mockUSDC.mint(
          user.address,
          depositAmount
        );

        await mockUSDC
          .connect(user)
          .approve(
            await savingCore.getAddress(),
            depositAmount
          );

        await savingCore
          .connect(user)
          .openDeposit(
            0,
            depositAmount
          );

        // Enable before closing
        await savingCore
          .connect(user)
          .setAutoRenew(
            0,
            true
          );

        // Close deposit
        await savingCore
          .connect(user)
          .withdrawEarly(0);

        // Cannot process renewal anymore
        await expect(
          savingCore.processAutoRenew(0)
        ).to.be.revertedWith(
          "Deposit is not active"
        );
      });


      it("should reject mature withdrawal for a deposit that does not exist", async function () {
        await expect(
          savingCore
            .connect(user)
            .withdrawAtMaturity(999)
        ).to.be.revertedWith(
          "Deposit does not exist"
        );
      });


      it("should reject early withdrawal for a deposit that does not exist", async function () {
        await expect(
          savingCore
            .connect(user)
            .withdrawEarly(999)
        ).to.be.revertedWith(
          "Deposit does not exist"
        );
      });

    });

    describe("SavingCore Final Branch Coverage", function () {

      it("should reject getting a deposit that does not exist", async function () {
        await expect(
          savingCore.getDeposit(999)
        ).to.be.revertedWith(
          "Deposit does not exist"
        );
      });
      describe("SavingCore Remaining Branch Coverage", function () {

        // =========================================================
        // 1. createPlan(): cover minDeposit == 0 with maxDeposit > 0
        // =========================================================
        it("should allow zero minimum with non-zero maximum deposit", async function () {
          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            0,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          const plan = await savingCore.getPlan(0);

          expect(plan.minDeposit).to.equal(0);
          expect(plan.maxDeposit).to.equal(MAX_DEPOSIT);
        });


        // =========================================================
        // 2. onlyOwner branch: updatePlan()
        // =========================================================
        it("should reject updatePlan from non-owner", async function () {
          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          await expect(
            savingCore
              .connect(user)
              .updatePlan(0, 300)
          ).to.be.reverted;
        });


        // =========================================================
        // 3. onlyOwner branch: enablePlan()
        // =========================================================
        it("should reject enablePlan from non-owner", async function () {
          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          await savingCore.disablePlan(0);

          await expect(
            savingCore
              .connect(user)
              .enablePlan(0)
          ).to.be.reverted;
        });


        // =========================================================
        // 4. onlyOwner branch: disablePlan()
        // =========================================================
        it("should reject disablePlan from non-owner", async function () {
          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          await expect(
            savingCore
              .connect(user)
              .disablePlan(0)
          ).to.be.reverted;
        });


        // =========================================================
        // 5. openDeposit():
        //    cover minDeposit == 0 AND maxDeposit == 0
        // =========================================================
        it("should open deposit when both min and max limits are zero", async function () {
          const amount =
            ethers.parseUnits("1000", 6);

          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            0,
            0,
            PENALTY_BPS
          );

          await mockUSDC.mint(
            user.address,
            amount
          );

          await mockUSDC
            .connect(user)
            .approve(
              await savingCore.getAddress(),
              amount
            );

          await savingCore
            .connect(user)
            .openDeposit(
              0,
              amount
            );

          const deposit =
            await savingCore.getDeposit(0);

          expect(
            deposit.principal
          ).to.equal(amount);
        });


        // =========================================================
        // 6. withdrawAtMaturity():
        //    cover interest == 0
        // =========================================================
        it("should withdraw at maturity with zero interest", async function () {
          const amount =
            ethers.parseUnits("1000", 6);

          // APR = 0 => interest = 0
          await savingCore.createPlan(
            TENOR_DAYS,
            0,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            PENALTY_BPS
          );

          await mockUSDC.mint(
            user.address,
            amount
          );

          await mockUSDC
            .connect(user)
            .approve(
              await savingCore.getAddress(),
              amount
            );

          await savingCore
            .connect(user)
            .openDeposit(
              0,
              amount
            );

          const deposit =
            await savingCore.getDeposit(0);

          await ethers.provider.send(
            "evm_setNextBlockTimestamp",
            [
              Number(
                deposit.maturityAt
              )
            ]
          );

          await ethers.provider.send(
            "evm_mine",
            []
          );

          await savingCore
            .connect(user)
            .withdrawAtMaturity(0);

          expect(
            await mockUSDC.balanceOf(
              user.address
            )
          ).to.equal(amount);
        });


        // =========================================================
        // 7. withdrawEarly():
        //    cover penalty == 0
        // =========================================================
        it("should withdraw early with zero penalty", async function () {
          const amount =
            ethers.parseUnits("1000", 6);

          // penaltyBps = 0
          await savingCore.createPlan(
            TENOR_DAYS,
            APR_BPS,
            MIN_DEPOSIT,
            MAX_DEPOSIT,
            0
          );

          await mockUSDC.mint(
            user.address,
            amount
          );

          await mockUSDC
            .connect(user)
            .approve(
              await savingCore.getAddress(),
              amount
            );

          await savingCore
            .connect(user)
            .openDeposit(
              0,
              amount
            );

          await savingCore
            .connect(user)
            .withdrawEarly(0);

          // No penalty => user receives all principal
          expect(
            await mockUSDC.balanceOf(
              user.address
            )
          ).to.equal(amount);
        });

      });
    });
  });
  describe("Pause / Unpause", function () {
    it("should block active deposit operations when paused", async function () {
      await savingCore.createPlan(
        90,   // tenorDays
        200,  // APR = 2%
        ethers.parseUnits("100", 6),
        ethers.parseUnits("10000", 6),
        400   // penalty = 4%
      );
      const amount = ethers.parseUnits("500", 6);

      // Mint USDC cho user
      await mockUSDC.mint(
        user.address,
        amount
      );

      // Approve SavingCore
      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          amount
        );

      // Mở Deposit #0 trước khi pause
      await savingCore
        .connect(user)
        .openDeposit(0, amount);

      // Pause hệ thống
      await savingCore.pause();

      // 1. setAutoRenew phải bị chặn
      await expect(
        savingCore
          .connect(user)
          .setAutoRenew(0, true)
      ).to.be.reverted;

      // 2. Early Withdraw phải bị chặn
      await expect(
        savingCore
          .connect(user)
          .withdrawEarly(0)
      ).to.be.reverted;

      // 3. Withdraw at Maturity cũng phải bị chặn
      await expect(
        savingCore
          .connect(user)
          .withdrawAtMaturity(0)
      ).to.be.reverted;

      // 4. Manual Renew phải bị chặn
      await expect(
        savingCore
          .connect(user)
          .renewDeposit(0, 0)
      ).to.be.reverted;

      // 5. Process Auto Renew phải bị chặn
      await expect(
        savingCore.processAutoRenew(0)
      ).to.be.reverted;

      // Unpause để xác nhận hệ thống hoạt động lại
      await savingCore.unpause();

      expect(
        await savingCore.paused()
      ).to.equal(false);
    });
    it("should allow only owner to pause and unpause", async function () {
      await savingCore.pause();

      expect(
        await savingCore.paused()
      ).to.equal(true);

      await savingCore.unpause();

      expect(
        await savingCore.paused()
      ).to.equal(false);

      await expect(
        savingCore.connect(user).pause()
      ).to.be.reverted;
    });

    it("should block deposit operations when paused", async function () {
      await savingCore.createPlan(
        90,
        200,
        0,
        0,
        400
      );

      const amount =
        ethers.parseUnits("500", 6);

      await mockUSDC.mint(
        user.address,
        amount
      );

      await mockUSDC
        .connect(user)
        .approve(
          await savingCore.getAddress(),
          amount
        );

      await savingCore.pause();

      await expect(
        savingCore
          .connect(user)
          .openDeposit(0, amount)
      ).to.be.reverted;
    });
  });
});