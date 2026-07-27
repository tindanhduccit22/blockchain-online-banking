import { useState } from "react";
import { ethers } from "ethers";

import { MOCK_USDC_ABI } from "../abi/MockUSDCABI";
import { SAVING_CORE_ABI } from "../abi/SavingCoreABI";

import { CONTRACT_ADDRESSES } from "../config/contracts";

const DEFAULT_PLAN = {
    tenorDays: "90",
    apr: 2.0,
    minDeposit: "10",
    maxDeposit: "10000",
    penalty: 4.0,
    enabled: true
};

export default function useSaving(account) {

    const [plan, setPlan] = useState(DEFAULT_PLAN);
    const [myDeposits, setMyDeposits] = useState([]);
    const [depositLoading, setDepositLoading] = useState(false);
    const [blockTimestamp, setBlockTimestamp] = useState(0);
    const [transactionStatus, setTransactionStatus] = useState("");
    const [approving, setApproving] = useState(false);

    async function isContractDeployed(provider, address) {
        try {
            const code = await provider.getCode(address);
            return code && code !== "0x" && code !== "0x0";
        } catch {
            return false;
        }
    }

    async function loadSavingPlan(provider) {
        try {
            const deployed = await isContractDeployed(provider, CONTRACT_ADDRESSES.savingCore);
            if (!deployed) {
                setPlan(DEFAULT_PLAN);
                return;
            }

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                provider
            );

            const result = await savingCore.getPlan(0);

            setPlan({
                tenorDays: result.tenorDays.toString(),
                apr: Number(result.aprBps) / 100,
                minDeposit: ethers.formatUnits(result.minDeposit, 6),
                maxDeposit: ethers.formatUnits(result.maxDeposit, 6),
                penalty: Number(result.earlyWithdrawPenaltyBps) / 100,
                enabled: result.enabled,
            });
        } catch (error) {
            console.warn("Could not load plan from contract, using default plan fallback:", error);
            setPlan(DEFAULT_PLAN);
        }
    }

    async function loadMyDeposit(provider, userAddress) {
        const targetAddress = userAddress || account;
        if (!targetAddress) return;

        try {
            const deployed = await isContractDeployed(provider, CONTRACT_ADDRESSES.savingCore);
            if (!deployed) {
                setMyDeposits([]);
                return;
            }

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                provider
            );

            const latestBlock = await provider.getBlock("latest");
            if (latestBlock) {
                setBlockTimestamp(Number(latestBlock.timestamp));
            }

            const nextId = await savingCore.nextDepositId();
            const totalDeposits = Number(nextId);

            if (totalDeposits === 0) {
                setMyDeposits([]);
                return;
            }

            const deposits = [];

            for (let depositId = 0; depositId < totalDeposits; depositId++) {
                try {
                    const owner = await savingCore.ownerOf(depositId);

                    if (!owner || owner.toLowerCase() !== targetAddress.toLowerCase()) {
                        continue;
                    }

                    const deposit = await savingCore.getDeposit(depositId);

                    const interest = await savingCore.calculateInterest(
                        deposit.principal,
                        deposit.aprBpsAtOpen,
                        deposit.tenorDays
                    );

                    let pendingInterestUnits = "0";
                    try {
                        const pending = await savingCore.pendingInterest(depositId);
                        pendingInterestUnits = ethers.formatUnits(pending, 6);
                    } catch (e) {
                        console.warn("pendingInterest read error:", e);
                    }

                    deposits.push({
                        id: depositId,
                        principal: ethers.formatUnits(deposit.principal, 6),
                        planId: deposit.planId.toString(),
                        openedAt: Number(deposit.openedAt),
                        maturityAt: Number(deposit.maturityAt),
                        tenorDays: deposit.tenorDays.toString(),
                        apr: Number(deposit.aprBpsAtOpen) / 100,
                        penalty: Number(deposit.penaltyBpsAtOpen) / 100,
                        status: Number(deposit.status),
                        autoRenew: deposit.autoRenew,
                        expectedInterest: ethers.formatUnits(interest, 6),
                        pendingInterest: pendingInterestUnits,
                    });
                } catch (error) {
                    console.error(`Deposit #${depositId} error:`, error);
                }
            }

            setMyDeposits(deposits);
        } catch (error) {
            console.error("loadMyDeposit error:", error);
        }
    }

    function validateDepositAmount(depositAmount, usdcBalance) {
        const amount = Number(depositAmount);

        if (!depositAmount || amount <= 0) {
            setTransactionStatus("❌ Please enter a valid deposit amount");
            return false;
        }

        if (plan) {
            if (plan.minDeposit && Number(plan.minDeposit) > 0 && amount < Number(plan.minDeposit)) {
                setTransactionStatus(`❌ Minimum deposit is ${plan.minDeposit} USDC`);
                return false;
            }

            if (plan.maxDeposit && Number(plan.maxDeposit) > 0 && amount > Number(plan.maxDeposit)) {
                setTransactionStatus(`❌ Maximum deposit is ${plan.maxDeposit} USDC`);
                return false;
            }
        }

        if (amount > Number(usdcBalance)) {
            setTransactionStatus("❌ Insufficient MockUSDC balance. Use the Testnet Faucet below to mint tokens.");
            return false;
        }

        return true;
    }

    async function approveUSDC(amount, onComplete) {
        if (!validateDepositAmount(amount, 999999999)) return false;

        try {
            setApproving(true);
            setDepositLoading(true);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const deployed = await isContractDeployed(provider, CONTRACT_ADDRESSES.savingCore);
            if (!deployed) {
                setTransactionStatus("❌ Contracts not deployed on Localhost! Run: npx hardhat run scripts/deploy.js --network localhost");
                return false;
            }

            setTransactionStatus("⏳ Step 1/2: Approving USDC allowance in MetaMask...");
            const signer = await provider.getSigner();

            const token = new ethers.Contract(
                CONTRACT_ADDRESSES.mockUSDC,
                MOCK_USDC_ABI,
                signer
            );

            const tx = await token.approve(
                CONTRACT_ADDRESSES.savingCore,
                ethers.parseUnits(amount.toString(), 6)
            );

            setTransactionStatus("⏳ Step 1/2: Waiting for approval confirmation...");
            await tx.wait();

            setTransactionStatus(`✅ Step 1/2 Complete: Approved ${amount} USDC limit! Now click "2. Open Deposit".`);

            if (onComplete) {
                const currentAddress = await signer.getAddress();
                await onComplete(provider, currentAddress);
            }
            return true;
        } catch (error) {
            console.error(error);
            const msg = error.reason || error.shortMessage || error.message || "Approval failed";
            setTransactionStatus(`❌ Approval Error: ${msg}`);
            return false;
        } finally {
            setApproving(false);
            setDepositLoading(false);
        }
    }

    async function openDeposit(amount, usdcBalance, onComplete) {
        if (!validateDepositAmount(amount, usdcBalance)) return false;

        try {
            setDepositLoading(true);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const deployed = await isContractDeployed(provider, CONTRACT_ADDRESSES.savingCore);
            if (!deployed) {
                setTransactionStatus("❌ Contracts not deployed on Localhost! Run: npx hardhat run scripts/deploy.js --network localhost");
                return false;
            }

            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                signer
            );

            const amountUnits = ethers.parseUnits(amount.toString(), 6);

            setTransactionStatus("⏳ Step 2/2: Confirming Open Deposit in MetaMask...");
            const tx = await savingCore.openDeposit(0, amountUnits);

            setTransactionStatus("⏳ Step 2/2: Minting SDC Deposit Certificate NFT...");
            await tx.wait();

            setTransactionStatus(`🎉 Success! Minted SDC Deposit Certificate for ${amount} USDC.`);
            await loadMyDeposit(provider, currentAddress);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
            return true;
        } catch (error) {
            console.error("Open deposit error:", error);
            const msg = error.reason || error.shortMessage || error.message || "Open Deposit failed";
            setTransactionStatus(`❌ Open Deposit Error: ${msg}`);
            return false;
        } finally {
            setDepositLoading(false);
        }
    }

    async function handleEarlyWithdraw(deposit, onComplete) {
        try {
            setDepositLoading(true);
            setTransactionStatus(`⏳ Processing early withdrawal for Certificate #${deposit.id}...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                signer
            );

            const tx = await savingCore.withdrawEarly(deposit.id);
            await tx.wait();

            setTransactionStatus(`✅ Early withdrawal complete for Certificate #${deposit.id}.`);
            await loadMyDeposit(provider, currentAddress);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
        } catch (error) {
            console.error(error);
            const msg = error.reason || error.shortMessage || error.message || "Early withdraw failed";
            setTransactionStatus(`❌ Early Withdraw Error: ${msg}`);
        } finally {
            setDepositLoading(false);
        }
    }

    async function handleMaturityWithdraw(deposit, onComplete) {
        try {
            setDepositLoading(true);
            setTransactionStatus(`⏳ Withdrawing principal + interest for Certificate #${deposit.id}...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                signer
            );

            const tx = await savingCore.withdrawAtMaturity(deposit.id);
            await tx.wait();

            setTransactionStatus(`🎉 Withdrawal complete! Principal & interest returned to your wallet.`);
            await loadMyDeposit(provider, currentAddress);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
        } catch (error) {
            console.error(error);
            const msg = error.reason || error.shortMessage || error.message || "Withdrawal failed";
            setTransactionStatus(`❌ Maturity Withdraw Error: ${msg}`);
        } finally {
            setDepositLoading(false);
        }
    }

    async function handlePrincipalOnlyWithdraw(deposit, onComplete) {
        try {
            setDepositLoading(true);
            setTransactionStatus(`⏳ Withdrawing 100% Principal (${deposit.principal} USDC) via C1 Safety Net...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                signer
            );

            const tx = await savingCore.withdrawPrincipalOnlyAtMaturity(deposit.id);
            await tx.wait();

            setTransactionStatus(`🎉 Principal recovered! ${deposit.principal} USDC returned to wallet. Interest recorded to pending claim.`);
            await loadMyDeposit(provider, currentAddress);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
        } catch (error) {
            console.error(error);
            const msg = error.reason || error.shortMessage || error.message || "Principal withdraw failed";
            setTransactionStatus(`❌ Principal Withdraw Error: ${msg}`);
        } finally {
            setDepositLoading(false);
        }
    }

    async function handleClaimPendingInterest(deposit, onComplete) {
        try {
            setDepositLoading(true);
            setTransactionStatus(`⏳ Claiming pending interest for Certificate #${deposit.id}...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                signer
            );

            const tx = await savingCore.claimPendingInterest(deposit.id);
            await tx.wait();

            setTransactionStatus(`🎉 Pending interest claimed successfully!`);
            await loadMyDeposit(provider, currentAddress);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
        } catch (error) {
            console.error(error);
            const msg = error.reason || error.shortMessage || error.message || "Claim interest failed";
            setTransactionStatus(`❌ Claim Interest Error: ${msg}`);
        } finally {
            setDepositLoading(false);
        }
    }

    async function handleManualRenew(deposit, onComplete) {
        try {
            setDepositLoading(true);
            setTransactionStatus(`⏳ Renewing Certificate #${deposit.id} into Plan #0...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                signer
            );

            const tx = await savingCore.renewDeposit(deposit.id, 0);
            await tx.wait();

            setTransactionStatus(`🎉 Successfully renewed Certificate #${deposit.id}! New principal compounded.`);
            await loadMyDeposit(provider, currentAddress);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
        } catch (error) {
            console.error(error);
            const msg = error.reason || error.shortMessage || error.message || "Renew failed";
            setTransactionStatus(`❌ Renew Error: ${msg}`);
        } finally {
            setDepositLoading(false);
        }
    }

    async function toggleAutoRenew(deposit, onComplete) {
        try {
            setDepositLoading(true);
            const newSetting = !deposit.autoRenew;
            setTransactionStatus(`⏳ ${newSetting ? "Enabling" : "Disabling"} Auto-Renew for Certificate #${deposit.id}...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const savingCore = new ethers.Contract(
                CONTRACT_ADDRESSES.savingCore,
                SAVING_CORE_ABI,
                signer
            );

            const tx = await savingCore.setAutoRenew(deposit.id, newSetting);
            await tx.wait();

            setTransactionStatus(`✅ Auto-Renew is now ${newSetting ? "ENABLED" : "DISABLED"} for Certificate #${deposit.id}.`);
            await loadMyDeposit(provider, currentAddress);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
        } catch (error) {
            console.error(error);
            const msg = error.reason || error.shortMessage || error.message || "Toggle Auto-Renew failed";
            setTransactionStatus(`❌ Auto-Renew Error: ${msg}`);
        } finally {
            setDepositLoading(false);
        }
    }

    async function mintUSDC(amount, onComplete) {
        if (!account) {
            setTransactionStatus("❌ Please connect your MetaMask wallet first.");
            return false;
        }

        const numAmount = Number(amount);
        if (!amount || isNaN(numAmount) || numAmount < 10 || numAmount > 10000) {
            setTransactionStatus("❌ Mint amount must be between 10 and 10,000 USDC.");
            return false;
        }

        try {
            setDepositLoading(true);
            setTransactionStatus(`⏳ Requesting ${amount} MockUSDC mint in MetaMask...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const deployed = await isContractDeployed(provider, CONTRACT_ADDRESSES.mockUSDC);
            if (!deployed) {
                setTransactionStatus("❌ Contracts not deployed on Localhost! Run: npx hardhat run scripts/deploy.js --network localhost");
                return false;
            }

            const signer = await provider.getSigner();
            const currentAddress = await signer.getAddress();

            const token = new ethers.Contract(
                CONTRACT_ADDRESSES.mockUSDC,
                MOCK_USDC_ABI,
                signer
            );

            const mintValue = ethers.parseUnits(amount.toString(), 6);
            const tx = await token.mint(currentAddress, mintValue);

            setTransactionStatus("⏳ Mint transaction submitted. Waiting for block confirmation...");
            await tx.wait();

            setTransactionStatus(`🎉 Minted ${amount} MockUSDC successfully to your wallet!`);

            if (onComplete) {
                await onComplete(provider, currentAddress);
            }
            return true;
        } catch (error) {
            console.error("Mint error:", error);
            const msg = error.reason || error.shortMessage || error.message || "Mint failed";
            setTransactionStatus(`❌ Mint Error: ${msg}`);
            return false;
        } finally {
            setDepositLoading(false);
        }
    }

    return {
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
    };
}