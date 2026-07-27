const { ethers } = require("hardhat");

async function main() {
    // Contract MockUSDC hiện đang deploy trên Hardhat Localhost
    const MOCK_USDC_ADDRESS =
        "0x5FC8d32690cc91D4c39d9d3abcBD16989F875707";

    // Hardhat Account #1 - tài khoản đã import vào MetaMask
    const USER_ADDRESS =
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    const mockUSDC = await ethers.getContractAt(
        "MockUSDC",
        MOCK_USDC_ADDRESS
    );

    const balanceBefore = await mockUSDC.balanceOf(USER_ADDRESS);

    console.log(
        "Balance before:",
        ethers.formatUnits(balanceBefore, 6),
        "mUSDC"
    );

    // Mint 1,000 MockUSDC
    const amount = ethers.parseUnits("1000", 6);

    const tx = await mockUSDC.mint(USER_ADDRESS, amount);

    await tx.wait();

    const balanceAfter = await mockUSDC.balanceOf(USER_ADDRESS);

    console.log("Mint successful!");
    console.log(
        "Balance after:",
        ethers.formatUnits(balanceAfter, 6),
        "mUSDC"
    );
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});