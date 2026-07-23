import { useState } from "react";
import { ethers } from "ethers";
import "./App.css";

import { MOCK_USDC_ABI } from "./abi/MockUSDCABI";
import { SAVING_CORE_ABI } from "./abi/SavingCoreABI";

import {
  CONTRACT_ADDRESSES,
  HARDHAT_CHAIN_ID,
} from "./config/contracts";

function App() {
  const [account, setAccount] = useState("");
  const [status, setStatus] = useState("Wallet not connected");

  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  const [usdcBalance, setUsdcBalance] = useState("0");

  const [depositAmount, setDepositAmount] = useState("500");
  const [transactionStatus, setTransactionStatus] = useState("");

  const [myDeposits, setMyDeposits] = useState([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [blockTimestamp, setBlockTimestamp] = useState(0);

  // =========================================================
  // CONNECT WALLET
  // =========================================================

  async function connectWallet() {
    try {
      if (!window.ethereum) {
        setStatus("MetaMask is not installed");
        return;
      }

      setLoading(true);

      const provider = new ethers.BrowserProvider(window.ethereum);

      const accounts = await provider.send(
        "eth_requestAccounts",
        []
      );

      const network = await provider.getNetwork();

      if (Number(network.chainId) !== HARDHAT_CHAIN_ID) {
        setStatus(
          "Please switch MetaMask to Hardhat Localhost"
        );

        setLoading(false);
        return;
      }

      const connectedAccount = accounts[0];

      setAccount(connectedAccount);
      setStatus("Wallet connected");

      await loadSavingPlan(provider);

      await loadUSDCBalance(
        provider,
        connectedAccount
      );

      await loadMyDeposit(
        provider,
        connectedAccount
      );
    } catch (error) {
      console.error(error);

      setStatus(
        "Failed to connect wallet"
      );
    } finally {
      setLoading(false);
    }
  }

  // =========================================================
  // LOAD SAVING PLAN
  // =========================================================

  async function loadSavingPlan(provider) {
    try {
      const savingCore = new ethers.Contract(
        CONTRACT_ADDRESSES.savingCore,
        SAVING_CORE_ABI,
        provider
      );

      const result =
        await savingCore.getPlan(0);

      setPlan({
        tenorDays:
          result.tenorDays.toString(),

        apr:
          Number(result.aprBps) / 100,

        minDeposit:
          ethers.formatUnits(
            result.minDeposit,
            6
          ),

        maxDeposit:
          ethers.formatUnits(
            result.maxDeposit,
            6
          ),

        penalty:
          Number(
            result.earlyWithdrawPenaltyBps
          ) / 100,

        enabled:
          result.enabled,
      });
    } catch (error) {
      console.error(
        "Failed to load Saving Plan:",
        error
      );

      setStatus(
        "Wallet connected, but failed to load Saving Plan"
      );
    }
  }

  // =========================================================
  // LOAD USDC BALANCE
  // =========================================================

  async function loadUSDCBalance(
    provider,
    userAddress
  ) {
    try {
      const token = new ethers.Contract(
        CONTRACT_ADDRESSES.mockUSDC,
        MOCK_USDC_ABI,
        provider
      );

      const balance =
        await token.balanceOf(
          userAddress
        );

      setUsdcBalance(
        ethers.formatUnits(
          balance,
          6
        )
      );
    } catch (error) {
      console.error(
        "Failed to load USDC balance:",
        error
      );
    }
  }

  // =========================================================
  // LOAD USER DEPOSIT
  // =========================================================

  async function loadMyDeposit(provider, userAddress) {
    try {
      const savingCore = new ethers.Contract(
        CONTRACT_ADDRESSES.savingCore,
        SAVING_CORE_ABI,
        provider
      );

      const latestBlock = await provider.getBlock("latest");

      setBlockTimestamp(
        Number(latestBlock.timestamp)
      );

      const nextId = await savingCore.nextDepositId();
      const totalDeposits = Number(nextId);

      if (totalDeposits === 0) {
        setMyDeposits([]);
        return;
      }

      const userDeposits = [];

      for (let depositId = 0; depositId < totalDeposits; depositId++) {
        try {
          const owner = await savingCore.ownerOf(depositId);

          if (
            owner.toLowerCase() !==
            userAddress.toLowerCase()
          ) {
            continue;
          }

          const deposit =
            await savingCore.getDeposit(depositId);

          const interest =
            await savingCore.calculateInterest(
              deposit.principal,
              deposit.aprBpsAtOpen,
              deposit.tenorDays
            );

          userDeposits.push({
            id: depositId,

            principal: ethers.formatUnits(
              deposit.principal,
              6
            ),

            planId: deposit.planId.toString(),

            openedAt: Number(deposit.openedAt),

            maturityAt: Number(deposit.maturityAt),

            tenorDays: deposit.tenorDays.toString(),

            apr:
              Number(deposit.aprBpsAtOpen) / 100,

            penalty:
              Number(deposit.penaltyBpsAtOpen) / 100,

            status: Number(deposit.status),

            autoRenew: deposit.autoRenew,

            expectedInterest: ethers.formatUnits(
              interest,
              6
            ),
          });
        } catch (error) {
          console.error(
            `Failed to load Deposit #${depositId}:`,
            error
          );
        }
      }

      setMyDeposits(userDeposits);
    } catch (error) {
      console.error(
        "Failed to load deposits:",
        error
      );

      setMyDeposits([]);
    }
  }

  // =========================================================
  // VALIDATE DEPOSIT AMOUNT
  // =========================================================

  function validateDepositAmount() {
    const amount =
      Number(depositAmount);

    if (
      !depositAmount ||
      amount <= 0
    ) {
      setTransactionStatus(
        "Please enter a valid amount"
      );

      return false;
    }

    if (plan) {
      if (
        amount <
        Number(plan.minDeposit)
      ) {
        setTransactionStatus(
          `Minimum deposit is ${plan.minDeposit} USDC`
        );

        return false;
      }

      if (
        amount >
        Number(plan.maxDeposit)
      ) {
        setTransactionStatus(
          `Maximum deposit is ${plan.maxDeposit} USDC`
        );

        return false;
      }
    }

    if (
      amount >
      Number(usdcBalance)
    ) {
      setTransactionStatus(
        "Insufficient MockUSDC balance"
      );

      return false;
    }

    return true;
  }

  // =========================================================
  // APPROVE USDC
  // =========================================================

  async function approveUSDC() {
    try {
      if (!validateDepositAmount()) {
        return;
      }

      setDepositLoading(true);

      setTransactionStatus(
        "Waiting for approval..."
      );

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const token =
        new ethers.Contract(
          CONTRACT_ADDRESSES.mockUSDC,
          MOCK_USDC_ABI,
          signer
        );

      const amount =
        ethers.parseUnits(
          depositAmount,
          6
        );

      const tx =
        await token.approve(
          CONTRACT_ADDRESSES.savingCore,
          amount
        );

      setTransactionStatus(
        "Approval submitted..."
      );

      await tx.wait();

      setTransactionStatus(
        `Approved ${depositAmount} USDC successfully`
      );
    } catch (error) {
      console.error(error);

      setTransactionStatus(
        "Approval failed or rejected"
      );
    } finally {
      setDepositLoading(false);
    }
  }

  // =========================================================
  // OPEN DEPOSIT
  // =========================================================

  async function openDeposit() {
    try {
      if (!validateDepositAmount()) {
        return;
      }

      setDepositLoading(true);

      setTransactionStatus(
        "Opening deposit..."
      );

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const savingCore =
        new ethers.Contract(
          CONTRACT_ADDRESSES.savingCore,
          SAVING_CORE_ABI,
          signer
        );

      const amount =
        ethers.parseUnits(
          depositAmount,
          6
        );

      const tx =
        await savingCore.openDeposit(
          0,
          amount
        );

      setTransactionStatus(
        "Transaction submitted..."
      );

      await tx.wait();

      setTransactionStatus(
        `Deposit opened successfully: ${depositAmount} USDC`
      );

      await loadUSDCBalance(
        provider,
        account
      );

      await loadMyDeposit(
        provider,
        account
      );
    } catch (error) {
      console.error(error);

      setTransactionStatus(
        "Deposit failed. Make sure USDC was approved first."
      );
    } finally {
      setDepositLoading(false);
    }
  }

  // =========================================================
  // EARLY WITHDRAW
  // =========================================================

  async function handleEarlyWithdraw(deposit) {
    try {
      if (!deposit) {
        return;
      }

      const confirmed = window.confirm(
        `Withdraw Deposit #${deposit.id} early?\n\nA ${deposit.penalty}% penalty will be applied.`
      );

      if (!confirmed) {
        return;
      }

      setDepositLoading(true);

      setTransactionStatus(
        `Withdrawing Deposit #${deposit.id}...`
      );

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const savingCore =
        new ethers.Contract(
          CONTRACT_ADDRESSES.savingCore,
          SAVING_CORE_ABI,
          signer
        );

      const tx =
        await savingCore.withdrawEarly(
          deposit.id
        );

      setTransactionStatus(
        `Early withdrawal for Deposit #${deposit.id} submitted...`
      );

      await tx.wait();

      setTransactionStatus(
        `Deposit #${deposit.id} withdrawn successfully`
      );

      await loadUSDCBalance(
        provider,
        account
      );

      await loadMyDeposit(
        provider,
        account
      );
    } catch (error) {
      console.error(error);

      setTransactionStatus(
        "Early withdrawal failed or rejected"
      );
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleMaturityWithdraw(deposit) {
    try {
      if (!deposit) {
        return;
      }

      const confirmed = window.confirm(
        `Withdraw matured Deposit #${deposit.id}?\n\nYou will receive your principal plus earned interest.`
      );

      if (!confirmed) {
        return;
      }

      setDepositLoading(true);

      setTransactionStatus(
        `Withdrawing matured Deposit #${deposit.id}...`
      );

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const savingCore =
        new ethers.Contract(
          CONTRACT_ADDRESSES.savingCore,
          SAVING_CORE_ABI,
          signer
        );

      const tx =
        await savingCore.withdrawAtMaturity(
          deposit.id
        );

      setTransactionStatus(
        `Maturity withdrawal for Deposit #${deposit.id} submitted...`
      );

      await tx.wait();

      setTransactionStatus(
        `Deposit #${deposit.id} withdrawn at maturity successfully`
      );

      await loadUSDCBalance(
        provider,
        account
      );

      await loadMyDeposit(
        provider,
        account
      );
    } catch (error) {
      console.error(error);

      setTransactionStatus(
        "Maturity withdrawal failed, rejected, or deposit has not matured yet"
      );
    } finally {
      setDepositLoading(false);
    }
  }

  async function handleManualRenew(deposit) {
    try {
      if (!deposit) {
        return;
      }

      const confirmed = window.confirm(
        `Renew Deposit #${deposit.id}?\n\n` +
        `Your principal and earned interest will be combined into a new deposit.`
      );

      if (!confirmed) {
        return;
      }

      setDepositLoading(true);

      setTransactionStatus(
        `Renewing Deposit #${deposit.id}...`
      );

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const savingCore =
        new ethers.Contract(
          CONTRACT_ADDRESSES.savingCore,
          SAVING_CORE_ABI,
          signer
        );

      // Currently using Saving Plan #0
      const newPlanId = 0;

      const tx =
        await savingCore.renewDeposit(
          deposit.id,
          newPlanId
        );

      setTransactionStatus(
        `Manual renewal for Deposit #${deposit.id} submitted...`
      );

      await tx.wait();

      setTransactionStatus(
        `Deposit #${deposit.id} renewed successfully`
      );

      await loadUSDCBalance(
        provider,
        account
      );

      await loadMyDeposit(
        provider,
        account
      );
    } catch (error) {
      console.error(error);

      setTransactionStatus(
        "Manual renewal failed, rejected, or deposit has not matured yet"
      );
    } finally {
      setDepositLoading(false);
    }
  }
  // =========================================================
  // AUTO RENEW
  // =========================================================

  async function toggleAutoRenew(deposit) {
    try {
      if (!deposit) {
        return;
      }

      setDepositLoading(true);

      const provider =
        new ethers.BrowserProvider(
          window.ethereum
        );

      const signer =
        await provider.getSigner();

      const savingCore =
        new ethers.Contract(
          CONTRACT_ADDRESSES.savingCore,
          SAVING_CORE_ABI,
          signer
        );

      const newValue =
        !deposit.autoRenew;

      setTransactionStatus(
        `Setting Auto Renew ${newValue ? "ON" : "OFF"
        } for Deposit #${deposit.id}...`
      );

      const tx =
        await savingCore.setAutoRenew(
          deposit.id,
          newValue
        );

      await tx.wait();

      setTransactionStatus(
        `Auto Renew ${newValue
          ? "enabled"
          : "disabled"
        } for Deposit #${deposit.id}`
      );

      await loadMyDeposit(
        provider,
        account
      );
    } catch (error) {
      console.error(error);

      setTransactionStatus(
        "Failed to update Auto Renew"
      );
    } finally {
      setDepositLoading(false);
    }
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="app">
      <div className="card">

        {/* HEADER */}

        <div className="header">
          <h1>
            Blockchain Online Banking
          </h1>

          <p className="subtitle">
            Decentralized Savings Platform
          </p>
        </div>

        {/* WALLET */}

        <div className="wallet-box">
          <p>
            <strong>Status:</strong>{" "}
            {status}
          </p>

          {account && (
            <p>
              <strong>Account:</strong>{" "}
              {account.slice(0, 6)}
              ...
              {account.slice(-4)}
            </p>
          )}
        </div>

        {/* BALANCE */}

        {account && (
          <div className="balance-box">
            <span>
              MockUSDC Balance
            </span>

            <strong>
              {usdcBalance} USDC
            </strong>
          </div>
        )}

        {/* CONNECT */}

        <button
          className="connect-button"
          onClick={connectWallet}
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : account
              ? "Wallet Connected"
              : "Connect MetaMask"}
        </button>

        {/* SAVING PLAN */}

        {plan && (
          <div className="plan-card">

            <h2>
              Saving Plan #0
            </h2>

            <div className="plan-row">
              <span>APR</span>

              <strong>
                {plan.apr}%
              </strong>
            </div>

            <div className="plan-row">
              <span>Tenor</span>

              <strong>
                {plan.tenorDays} days
              </strong>
            </div>

            <div className="plan-row">
              <span>
                Minimum Deposit
              </span>

              <strong>
                {plan.minDeposit} USDC
              </strong>
            </div>

            <div className="plan-row">
              <span>
                Maximum Deposit
              </span>

              <strong>
                {plan.maxDeposit} USDC
              </strong>
            </div>

            <div className="plan-row">
              <span>
                Early Withdrawal Penalty
              </span>

              <strong>
                {plan.penalty}%
              </strong>
            </div>

            <div className="plan-row">
              <span>Status</span>

              <strong>
                {plan.enabled
                  ? "Active"
                  : "Disabled"}
              </strong>
            </div>

          </div>
        )}

        {/* OPEN DEPOSIT */}

        {account && plan && (
          <div className="deposit-card">

            <h2>
              Open Saving Deposit
            </h2>

            <label>
              Deposit Amount (USDC)
            </label>

            <input
              type="number"
              value={depositAmount}
              onChange={(e) =>
                setDepositAmount(
                  e.target.value
                )
              }
              min={plan.minDeposit}
              max={plan.maxDeposit}
            />

            <div className="deposit-actions">

              <button
                onClick={approveUSDC}
                disabled={depositLoading}
              >
                {depositLoading
                  ? "Processing..."
                  : "1. Approve USDC"}
              </button>

              <button
                onClick={openDeposit}
                disabled={depositLoading}
              >
                {depositLoading
                  ? "Processing..."
                  : "2. Open Deposit"}
              </button>

            </div>

            {transactionStatus && (
              <p className="transaction-status">
                {transactionStatus}
              </p>
            )}

          </div>
        )}

        {/* MY DEPOSITS */}

        {myDeposits.length > 0 && (
          <div className="my-savings-section">

            <h2
              style={{
                marginTop: "30px",
                marginBottom: "10px",
              }}
            >
              My Savings
            </h2>

            <p
              style={{
                color: "#666",
                marginBottom: "20px",
              }}
            >
              {myDeposits.length} saving deposit
              {myDeposits.length > 1 ? "s" : ""}
            </p>

            {myDeposits.map((deposit) => (
              <div
                className="my-deposit-card"
                key={deposit.id}
              >

                <div className="deposit-title">

                  <div>
                    <h2>
                      My Deposit #{deposit.id}
                    </h2>

                    <span>
                      NFT Saving Deposit Certificate
                    </span>
                  </div>

                  <span
                    className={
                      deposit.status === 0
                        ? "status-active"
                        : "status-closed"
                    }
                  >
                    {deposit.status === 0
                      ? "ACTIVE"
                      : deposit.status === 1
                        ? "WITHDRAWN"
                        : deposit.status === 2
                          ? "MANUAL RENEWED"
                          : deposit.status === 3
                            ? "AUTO RENEWED"
                            : "CLOSED"}
                  </span>

                </div>

                <div className="deposit-info-row">
                  <span>Principal</span>

                  <strong>
                    {deposit.principal} USDC
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>Plan</span>

                  <strong>
                    Plan #{deposit.planId}
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>APR</span>

                  <strong>
                    {deposit.apr}%
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>Tenor</span>

                  <strong>
                    {deposit.tenorDays} days
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>
                    Expected Interest
                  </span>

                  <strong>
                    {deposit.expectedInterest} USDC
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>
                    Opened Date
                  </span>

                  <strong>
                    {new Date(
                      deposit.openedAt * 1000
                    ).toLocaleString()}
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>
                    Maturity Date
                  </span>

                  <strong>
                    {new Date(
                      deposit.maturityAt * 1000
                    ).toLocaleString()}
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>
                    Early Withdrawal Penalty
                  </span>

                  <strong>
                    {deposit.penalty}%
                  </strong>
                </div>

                <div className="deposit-info-row">
                  <span>
                    Auto Renew
                  </span>

                  <strong>
                    {deposit.autoRenew
                      ? "ON"
                      : "OFF"}
                  </strong>
                </div>

                {deposit.status === 0 && (
                  <div className="deposit-buttons">

                    {blockTimestamp < deposit.maturityAt ? (
                      <>
                        <button
                          onClick={() =>
                            toggleAutoRenew(deposit)
                          }
                          disabled={depositLoading}
                        >
                          {deposit.autoRenew
                            ? "Disable Auto Renew"
                            : "Enable Auto Renew"}
                        </button>

                        <button
                          className="withdraw-button"
                          onClick={() =>
                            handleEarlyWithdraw(deposit)
                          }
                          disabled={depositLoading}
                        >
                          Early Withdraw
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="maturity-button"
                          onClick={() =>
                            handleMaturityWithdraw(deposit)
                          }
                          disabled={depositLoading}
                        >
                          Withdraw at Maturity
                        </button>

                        <button
                          className="renew-button"
                          onClick={() =>
                            handleManualRenew(deposit)
                          }
                          disabled={depositLoading}
                        >
                          Renew Deposit
                        </button>
                      </>
                    )}

                  </div>
                )}

              </div>
            ))}

          </div>
        )}

      </div>
    </div>
  );
}

export default App;