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
  });
});