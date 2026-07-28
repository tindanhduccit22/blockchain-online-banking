import { useState } from "react";
import DepositCard from "./DepositCard";

export default function DepositList({
  myDeposits,
  blockTimestamp,
  depositLoading,
  handleEarlyWithdraw,
  handleMaturityWithdraw,
  handlePrincipalOnlyWithdraw,
  handleClaimPendingInterest,
  handleManualRenew,
  toggleAutoRenew,
}) {
  const [showHistory, setShowHistory] = useState(false);

  if (!myDeposits || myDeposits.length === 0) {
    return (
      <div className="panel-card empty-state animate-fade-in">
        <div className="empty-icon">📂</div>
        <div className="empty-title">No Deposit Certificates Yet</div>
        <div className="empty-desc">
          Open a fixed-term deposit on the left panel to mint your first ERC721 Certificate NFT.
        </div>
      </div>
    );
  }

  const activeDeposits = myDeposits.filter((d) => d.status === 0);
  const historyDeposits = myDeposits.filter((d) => d.status !== 0);

  const displayedDeposits = showHistory ? myDeposits : (activeDeposits.length > 0 ? activeDeposits : myDeposits);

  return (
    <div className="deposit-list-container">
      <div className="panel-header" style={{ marginBottom: "16px" }}>
        <div className="panel-title">
          <span className="panel-title-icon">📜</span>
          My Deposit Certificates ({activeDeposits.length} Active)
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {historyDeposits.length > 0 && (
            <button
              type="button"
              className={`badge ${showHistory ? "badge-role-admin" : "badge-network"}`}
              onClick={() => setShowHistory(!showHistory)}
              style={{ cursor: "pointer", border: "none" }}
            >
              {showHistory ? "📜 Showing All (Inc. History)" : "⚡ Filter Active Only"}
            </button>
          )}
          <span className="badge badge-network">ERC721 TOKENS</span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {displayedDeposits.map((deposit) => (
          <DepositCard
            key={deposit.id}
            deposit={deposit}
            blockTimestamp={blockTimestamp}
            depositLoading={depositLoading}
            handleEarlyWithdraw={handleEarlyWithdraw}
            handleMaturityWithdraw={handleMaturityWithdraw}
            handlePrincipalOnlyWithdraw={handlePrincipalOnlyWithdraw}
            handleClaimPendingInterest={handleClaimPendingInterest}
            handleManualRenew={handleManualRenew}
            toggleAutoRenew={toggleAutoRenew}
          />
        ))}
      </div>
    </div>
  );
}