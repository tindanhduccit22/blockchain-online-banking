const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SavingCore", function () {
  async function deploySavingCore() {
    const [owner, user, feeReceiver] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy();

    const VaultManager = await ethers.getContractFactory("VaultManager");
    const vault = await VaultManager.deploy(
      await token.getAddress(),
      feeReceiver.address
    );

    const SavingCore = await ethers.getContractFactory("SavingCore");
    const savingCore = await SavingCore.deploy(
      await token.getAddress(),
      await vault.getAddress()
    );

    return {
      token,
      vault,
      savingCore,
      owner,
      user,
      feeReceiver,
    };
  }

  it("should initialize with the correct token and vault manager", async function () {
    const { token, vault, savingCore } = await deploySavingCore();

    expect(await savingCore.token()).to.equal(await token.getAddress());
    expect(await savingCore.vaultManager()).to.equal(
      await vault.getAddress()
    );
  });

  it("should allow the owner to create a saving plan", async function () {
    const { savingCore } = await deploySavingCore();

    const duration = 30 * 24 * 60 * 60;
    const aprBps = 500;
    const penaltyBps = 200;

    await savingCore.createPlan(duration, aprBps, penaltyBps);

    const plan = await savingCore.getPlan(0);

    expect(plan.duration).to.equal(duration);
    expect(plan.aprBps).to.equal(aprBps);
    expect(plan.penaltyBps).to.equal(penaltyBps);
    expect(plan.active).to.equal(true);
    expect(await savingCore.nextPlanId()).to.equal(1);
  });

  it("should reject plan creation from a non-owner", async function () {
    const { savingCore, user } = await deploySavingCore();

    const duration = 30 * 24 * 60 * 60;

    await expect(
      savingCore.connect(user).createPlan(duration, 500, 200)
    ).to.be.revertedWithCustomError(
      savingCore,
      "OwnableUnauthorizedAccount"
    );
  });

  it("should allow the owner to update a saving plan", async function () {
    const { savingCore } = await deploySavingCore();

    await savingCore.createPlan(
      30 * 24 * 60 * 60,
      500,
      200
    );

    const newDuration = 90 * 24 * 60 * 60;
    const newAprBps = 700;
    const newPenaltyBps = 300;

    await savingCore.updatePlan(
      0,
      newDuration,
      newAprBps,
      newPenaltyBps
    );

    const plan = await savingCore.getPlan(0);

    expect(plan.duration).to.equal(newDuration);
    expect(plan.aprBps).to.equal(newAprBps);
    expect(plan.penaltyBps).to.equal(newPenaltyBps);
  });

  it("should allow the owner to deactivate and reactivate a plan", async function () {
    const { savingCore } = await deploySavingCore();

    await savingCore.createPlan(
      30 * 24 * 60 * 60,
      500,
      200
    );

    await savingCore.setPlanActive(0, false);

    let plan = await savingCore.getPlan(0);
    expect(plan.active).to.equal(false);

    await savingCore.setPlanActive(0, true);

    plan = await savingCore.getPlan(0);
    expect(plan.active).to.equal(true);
  });

  it("should reject plan updates from a non-owner", async function () {
    const { savingCore, user } = await deploySavingCore();

    await savingCore.createPlan(
      30 * 24 * 60 * 60,
      500,
      200
    );

    await expect(
      savingCore
        .connect(user)
        .updatePlan(0, 60 * 24 * 60 * 60, 600, 250)
    ).to.be.revertedWithCustomError(
      savingCore,
      "OwnableUnauthorizedAccount"
    );
  });

  it("should reject zero duration", async function () {
    const { savingCore } = await deploySavingCore();

    await expect(
      savingCore.createPlan(0, 500, 200)
    ).to.be.revertedWith(
      "Duration must be greater than zero"
    );
  });

  it("should reject APR greater than 100 percent", async function () {
    const { savingCore } = await deploySavingCore();

    await expect(
      savingCore.createPlan(
        30 * 24 * 60 * 60,
        10001,
        200
      )
    ).to.be.revertedWith("APR exceeds maximum");
  });

  it("should reject penalty greater than 100 percent", async function () {
    const { savingCore } = await deploySavingCore();

    await expect(
      savingCore.createPlan(
        30 * 24 * 60 * 60,
        500,
        10001
      )
    ).to.be.revertedWith("Penalty exceeds maximum");
  });

  it("should reject access to a plan that does not exist", async function () {
    const { savingCore } = await deploySavingCore();

    await expect(
      savingCore.getPlan(0)
    ).to.be.revertedWith("Plan does not exist");
  });
});