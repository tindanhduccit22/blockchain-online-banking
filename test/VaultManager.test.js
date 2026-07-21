const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VaultManager", function () {
  async function deployVaultManager() {
    const [owner, user, feeReceiver, newFeeReceiver] =
      await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy();

    const VaultManager = await ethers.getContractFactory("VaultManager");
    const vault = await VaultManager.deploy(
      await token.getAddress(),
      feeReceiver.address
    );

    return {
      token,
      vault,
      owner,
      user,
      feeReceiver,
      newFeeReceiver,
    };
  }

  it("should initialize with the correct token and fee receiver", async function () {
    const { token, vault, feeReceiver } = await deployVaultManager();

    expect(await vault.token()).to.equal(await token.getAddress());
    expect(await vault.feeReceiver()).to.equal(feeReceiver.address);
  });

  it("should allow tokens to be funded into the vault", async function () {
    const { token, vault, owner } = await deployVaultManager();

    const amount = ethers.parseUnits("1000", 6);

    await token.mint(owner.address, amount);
    await token.approve(await vault.getAddress(), amount);
    await vault.fundVault(amount);

    expect(await vault.getVaultBalance()).to.equal(amount);
  });

  it("should allow only the owner to withdraw vault funds", async function () {
    const { token, vault, owner } = await deployVaultManager();

    const fundAmount = ethers.parseUnits("1000", 6);
    const withdrawAmount = ethers.parseUnits("200", 6);

    await token.mint(owner.address, fundAmount);
    await token.approve(await vault.getAddress(), fundAmount);
    await vault.fundVault(fundAmount);

    await vault.withdrawVault(withdrawAmount);

    expect(await token.balanceOf(owner.address)).to.equal(withdrawAmount);
    expect(await vault.getVaultBalance()).to.equal(
      fundAmount - withdrawAmount
    );
  });

  it("should reject vault withdrawal from a non-owner", async function () {
    const { vault, user } = await deployVaultManager();

    const amount = ethers.parseUnits("100", 6);

    await expect(
      vault.connect(user).withdrawVault(amount)
    ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
  });

  it("should allow the owner to update the fee receiver", async function () {
    const { vault, newFeeReceiver } = await deployVaultManager();

    await vault.setFeeReceiver(newFeeReceiver.address);

    expect(await vault.feeReceiver()).to.equal(newFeeReceiver.address);
  });

  it("should reject fee receiver updates from a non-owner", async function () {
    const { vault, user, newFeeReceiver } = await deployVaultManager();

    await expect(
      vault.connect(user).setFeeReceiver(newFeeReceiver.address)
    ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
  });

  it("should allow the owner to pause and unpause", async function () {
    const { vault } = await deployVaultManager();

    await vault.pause();
    expect(await vault.paused()).to.equal(true);

    await vault.unpause();
    expect(await vault.paused()).to.equal(false);
  });

  it("should reject zero amount when funding the vault", async function () {
    const { vault } = await deployVaultManager();

    await expect(vault.fundVault(0)).to.be.revertedWith(
      "Amount must be greater than zero"
    );
  });

  it("should reject an invalid fee receiver", async function () {
    const { vault } = await deployVaultManager();

    await expect(
      vault.setFeeReceiver(ethers.ZeroAddress)
    ).to.be.revertedWith("Invalid fee receiver");
  });

  it("should reject withdrawal greater than the vault balance", async function () {
    const { vault } = await deployVaultManager();

    const amount = ethers.parseUnits("100", 6);

    await expect(vault.withdrawVault(amount)).to.be.revertedWith(
      "Insufficient vault balance"
    );
  });
});