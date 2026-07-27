import { useEffect, useState } from "react";
import { ethers } from "ethers";

import "./App.css";

import { MOCK_USDC_ABI } from "./abi/MockUSDCABI";

import useWallet from "./hooks/useWallet";
import useSaving from "./hooks/useSaving";
import useVault from "./hooks/useVault";
import useInitialize from "./hooks/useInitialize";

import UserDashboard from "./pages/UserDashboard";
import AdminPanel from "./pages/AdminPanel";

import { CONTRACT_ADDRESSES } from "./config/contracts";
import { ADMIN_ADDRESS } from "./config/admin";

function App() {
  const { account, status, loading, connectWallet } = useWallet();

  const isAdmin =
    account && account.toLowerCase() === ADMIN_ADDRESS.toLowerCase();

  const {
    plan,
    myDeposits,
    depositLoading,
    blockTimestamp,
    transactionStatus,
    setTransactionStatus,
    approving,

    loadSavingPlan,
    loadMyDeposit,

    approveUSDC,
    openDeposit,

    handleEarlyWithdraw,
    handleMaturityWithdraw,
    handlePrincipalOnlyWithdraw,
    handleClaimPendingInterest,
    handleManualRenew,

    toggleAutoRenew,
    mintUSDC,
  } = useSaving(account);

  const {
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

    mintAdmin,
  } = useVault();

  const [usdcBalance, setUsdcBalance] = useState("0");
  const [depositAmount, setDepositAmount] = useState("500");

  async function loadUSDCBalance(provider, userAddress) {
    if (!userAddress) return;
    try {
      const token = new ethers.Contract(
        CONTRACT_ADDRESSES.mockUSDC,
        MOCK_USDC_ABI,
        provider
      );

      const balance = await token.balanceOf(userAddress);
      setUsdcBalance(ethers.formatUnits(balance, 6));
    } catch (error) {
      console.error("Load balance failed", error);
    }
  }

  const { initialize } = useInitialize({
    connectWallet,
    loadSavingPlan,
    loadVaultBalance,
    loadUSDCBalance,
    loadMyDeposit,
  });

  async function refreshData(providedProvider, targetAddress) {
    try {
      const p = providedProvider || (window.ethereum ? new ethers.BrowserProvider(window.ethereum) : null);
      const addr = targetAddress || account;

      if (!p || !addr) return;

      await loadSavingPlan(p);
      await loadVaultBalance(p);
      await loadUSDCBalance(p, addr);
      await loadMyDeposit(p, addr);
      if (isAdmin) {
        await loadAdminBalance(p, addr);
      }
    } catch (err) {
      console.error("refreshData error:", err);
    }
  }

  useEffect(() => {
    if (!account) return;

    async function refresh() {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        await refreshData(provider, account);
      }
    }

    refresh();
  }, [account]);

  async function handleMint() {
    const success = await mintUSDC(mintAmount, refreshData);
    if (success) {
      await refreshData();
    }
  }

  async function handleOpenDeposit(amount, currentUsdcBalance) {
    const success = await openDeposit(amount, currentUsdcBalance, refreshData);
    if (success) {
      await refreshData();
    }
  }

  async function handleWrappedEarlyWithdraw(deposit) {
    await handleEarlyWithdraw(deposit, refreshData);
    await refreshData();
  }

  async function handleWrappedMaturityWithdraw(deposit) {
    await handleMaturityWithdraw(deposit, refreshData);
    await refreshData();
  }

  async function handleWrappedPrincipalOnlyWithdraw(deposit) {
    await handlePrincipalOnlyWithdraw(deposit, refreshData);
    await refreshData();
  }

  async function handleWrappedClaimPendingInterest(deposit) {
    await handleClaimPendingInterest(deposit, refreshData);
    await refreshData();
  }

  async function handleWrappedManualRenew(deposit) {
    await handleManualRenew(deposit, refreshData);
    await refreshData();
  }

  async function handleWrappedToggleAutoRenew(deposit) {
    await toggleAutoRenew(deposit, refreshData);
    await refreshData();
  }

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <nav className="navbar animate-fade-in">
        <div className="nav-brand">
          <div className="brand-icon">🏛️</div>
          <div>
            <div className="brand-title">
              Online Banking
              <span className="badge badge-network">Hardhat Localnet</span>
            </div>
            <div className="brand-subtitle">
              Decentralized Fixed-Term Savings & NFT Certificates
            </div>
          </div>
        </div>

        <div className="nav-actions">
          {account && (
            <>
              <span className={`badge ${isAdmin ? "badge-role-admin" : "badge-role-user"}`}>
                {isAdmin ? "👑 BANK ADMIN" : "👤 DEPOSITOR"}
              </span>

              <div className="account-pill">
                <div className="wallet-dot" />
                {account.slice(0, 6)}...{account.slice(-4)}
              </div>
            </>
          )}

          <button
            className={`btn ${account ? "btn-secondary" : "btn-primary"}`}
            onClick={initialize}
            disabled={loading}
          >
            {loading
              ? "Connecting..."
              : account
                ? "Wallet Connected"
                : "🦊 Connect MetaMask"}
          </button>
        </div>
      </nav>

      {/* Global Transaction Status Banner */}
      {transactionStatus && (
        <div
          className={`status-msg animate-fade-in ${transactionStatus.startsWith("❌")
              ? "status-msg-info"
              : transactionStatus.startsWith("🎉") || transactionStatus.startsWith("✅")
                ? "status-msg-success"
                : "status-msg-info"
            }`}
          style={{ marginBottom: "24px", fontSize: "14px", padding: "12px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span>{transactionStatus}</span>
          <button
            style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", fontSize: "16px", fontWeight: "bold" }}
            onClick={() => setTransactionStatus("")}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!account ? (
        <div className="empty-state animate-fade-in" style={{ marginTop: "40px" }}>
          <div className="empty-icon">🔐</div>
          <div className="empty-title">Welcome to VaultX Blockchain Bank</div>
          <div className="empty-desc" style={{ marginBottom: "20px" }}>
            Connect your MetaMask wallet to access high-yield fixed term saving plans, mint NFT deposit certificates, and manage your liquidity.
          </div>
          <button className="btn btn-primary" onClick={initialize} disabled={loading}>
            🦊 Connect MetaMask Wallet
          </button>
        </div>
      ) : isAdmin ? (
        <AdminPanel
          account={account}
          status={status}
          adminBalance={adminBalance}
          mintAmount={mintAmount}
          setMintAmount={setMintAmount}
          mintAdmin={async (acc) => {
            const res = await mintAdmin(acc, setTransactionStatus);
            if (res) await refreshData();
          }}
          vaultBalance={vaultBalance}
          reservedInterest={reservedInterest}
          vaultAmount={vaultAmount}
          setVaultAmount={setVaultAmount}
          withdrawVaultAmount={withdrawVaultAmount}
          setWithdrawVaultAmount={setWithdrawVaultAmount}
          approveVault={async () => {
            const res = await approveVault(setTransactionStatus);
            if (res) await refreshData();
          }}
          withdrawVault={async () => {
            const res = await withdrawVault(setTransactionStatus);
            if (res) await refreshData();
          }}
          depositLoading={depositLoading}
        />
      ) : (
        <UserDashboard
          account={account}
          status={status}
          usdcBalance={usdcBalance}
          vaultBalance={vaultBalance}
          mintAmount={mintAmount}
          setMintAmount={setMintAmount}
          handleMint={handleMint}
          plan={plan}
          depositAmount={depositAmount}
          setDepositAmount={setDepositAmount}
          approveUSDC={approveUSDC}
          openDeposit={handleOpenDeposit}
          approving={approving}
          transactionStatus={transactionStatus}
          depositLoading={depositLoading}
          myDeposits={myDeposits}
          blockTimestamp={blockTimestamp}
          handleEarlyWithdraw={handleWrappedEarlyWithdraw}
          handleMaturityWithdraw={handleWrappedMaturityWithdraw}
          handlePrincipalOnlyWithdraw={handleWrappedPrincipalOnlyWithdraw}
          handleClaimPendingInterest={handleWrappedClaimPendingInterest}
          handleManualRenew={handleWrappedManualRenew}
          toggleAutoRenew={handleWrappedToggleAutoRenew}
        />
      )}
    </div>
  );
}

export default App;