import { useState } from "react";
import { ethers } from "ethers";

import { MOCK_USDC_ABI } from "../abi/MockUSDCABI";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { VAULT_MANAGER_ABI } from "../abi/VaultManagerABI";

function useVault() {
  const [vaultAmount, setVaultAmount] = useState("100");
  const [withdrawVaultAmount, setWithdrawVaultAmount] = useState("50");
  const [vaultBalance, setVaultBalance] = useState("0");
  const [reservedInterest, setReservedInterest] = useState("0");
  const [adminBalance, setAdminBalance] = useState("0");
  const [mintAmount, setMintAmount] = useState("1000");

  async function loadAdminBalance(provider, account) {
    if (!account) return;
    try {
      const token = new ethers.Contract(
        CONTRACT_ADDRESSES.mockUSDC,
        MOCK_USDC_ABI,
        provider
      );

      const balance = await token.balanceOf(account);
      setAdminBalance(ethers.formatUnits(balance, 6));
    } catch (err) {
      console.error("loadAdminBalance error:", err);
    }
  }

  async function mintAdmin(account, setStatus) {
    try {
      if (setStatus) setStatus(`⏳ Requesting ${mintAmount} MockUSDC mint for Admin in MetaMask...`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const token = new ethers.Contract(
        CONTRACT_ADDRESSES.mockUSDC,
        MOCK_USDC_ABI,
        signer
      );

      const tx = await token.mint(
        account,
        ethers.parseUnits(mintAmount, 6)
      );

      if (setStatus) setStatus("⏳ Waiting for block confirmation...");
      await tx.wait();

      if (setStatus) setStatus(`🎉 Minted ${mintAmount} MockUSDC to Admin wallet!`);
      await loadAdminBalance(provider, account);
      return true;
    } catch (error) {
      console.error(error);
      const msg = error.reason || error.shortMessage || error.message || "Mint Admin failed";
      if (setStatus) setStatus(`❌ Mint Admin Error: ${msg}`);
      return false;
    }
  }

  async function loadVaultBalance(provider) {
    try {
      const vault = new ethers.Contract(
        CONTRACT_ADDRESSES.vaultManager,
        [
          "function getVaultBalance() view returns(uint256)",
          "function reservedInterest() view returns(uint256)"
        ],
        provider
      );

      const balance = await vault.getVaultBalance();
      setVaultBalance(ethers.formatUnits(balance, 6));

      try {
        const reserved = await vault.reservedInterest();
        setReservedInterest(ethers.formatUnits(reserved, 6));
      } catch (e) {
        console.warn("reservedInterest read error:", e);
      }
    } catch (error) {
      console.error("loadVaultBalance error:", error);
    }
  }

  async function approveVault(setStatus) {
    try {
      if (setStatus) setStatus("⏳ Step 1/2: Approving USDC spending for VaultManager...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const token = new ethers.Contract(
        CONTRACT_ADDRESSES.mockUSDC,
        MOCK_USDC_ABI,
        signer
      );

      const vault = new ethers.Contract(
        CONTRACT_ADDRESSES.vaultManager,
        VAULT_MANAGER_ABI,
        signer
      );

      const amount = ethers.parseUnits(vaultAmount, 6);

      const approveTx = await token.approve(
        CONTRACT_ADDRESSES.vaultManager,
        amount
      );

      if (setStatus) setStatus("⏳ Step 1/2: Waiting for approval confirmation...");
      await approveTx.wait();

      if (setStatus) setStatus("⏳ Step 2/2: Funding VaultManager pool...");
      const fundTx = await vault.fundVault(amount);

      if (setStatus) setStatus("⏳ Step 2/2: Waiting for block confirmation...");
      await fundTx.wait();

      if (setStatus) setStatus(`🎉 Successfully funded ${vaultAmount} USDC to VaultManager!`);
      await loadVaultBalance(provider);
      return true;
    } catch (error) {
      console.error(error);
      const msg = error.reason || error.shortMessage || error.message || "Fund Vault failed";
      if (setStatus) setStatus(`❌ Fund Vault Error: ${msg}`);
      return false;
    }
  }

  async function withdrawVault(setStatus) {
    try {
      if (setStatus) setStatus(`⏳ Testing C2 Solvency Guard: Withdrawing ${withdrawVaultAmount} USDC from Vault...`);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const vault = new ethers.Contract(
        CONTRACT_ADDRESSES.vaultManager,
        VAULT_MANAGER_ABI,
        signer
      );

      const amount = ethers.parseUnits(withdrawVaultAmount, 6);
      const tx = await vault.withdrawVault(amount);

      if (setStatus) setStatus("⏳ Waiting for block confirmation...");
      await tx.wait();

      if (setStatus) setStatus(`🎉 Successfully withdrew ${withdrawVaultAmount} USDC from Vault to Admin wallet!`);
      await loadVaultBalance(provider);
      return true;
    } catch (error) {
      console.error("withdrawVault error:", error);
      const msg = error.reason || error.shortMessage || error.message || "Withdraw Vault failed";
      if (setStatus) setStatus(`❌ Withdraw Vault Error: ${msg}`);
      return false;
    }
  }

  return {
    vaultAmount,
    setVaultAmount,
    withdrawVaultAmount,
    setWithdrawVaultAmount,
    vaultBalance,
    reservedInterest,
    loadVaultBalance,
    approveVault,
    withdrawVault,
    adminBalance,
    loadAdminBalance,
    mintAmount,
    setMintAmount,
    mintAdmin
  };
}

export default useVault;