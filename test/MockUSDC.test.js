const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MockUSDC", function () {
  async function deployMockUSDC() {
    const [owner, user] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const token = await MockUSDC.deploy();

    return { token, owner, user };
  }

  it("should use 6 decimals", async function () {
    const { token } = await deployMockUSDC();

    expect(await token.decimals()).to.equal(6);
  });

  it("should mint tokens to an address", async function () {
    const { token, user } = await deployMockUSDC();

    const amount = ethers.parseUnits("1000", 6);

    await token.mint(user.address, amount);

    expect(await token.balanceOf(user.address)).to.equal(amount);
  });

  it("should transfer tokens between accounts", async function () {
    const { token, owner, user } = await deployMockUSDC();

    const mintAmount = ethers.parseUnits("1000", 6);
    const transferAmount = ethers.parseUnits("100", 6);

    await token.mint(owner.address, mintAmount);
    await token.transfer(user.address, transferAmount);

    expect(await token.balanceOf(user.address)).to.equal(transferAmount);
  });
});