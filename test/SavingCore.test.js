const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SavingCore", function () {
  let savingCore;
  let owner;
  let user;

  const TENOR_DAYS = 90;
  const APR_BPS = 200;
  const PENALTY_BPS = 400;

  const MIN_DEPOSIT = 100_000000;
  const MAX_DEPOSIT = 10_000_000000;

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

    const SavingCore = await ethers.getContractFactory(
      "SavingCore"
    );

    savingCore = await SavingCore.deploy();
    await savingCore.waitForDeployment();
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
});