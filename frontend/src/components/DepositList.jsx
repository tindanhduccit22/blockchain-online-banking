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
  if (!myDeposits || myDeposits.length === 0) {
    return (
      <div className="panel-card empty-state animate-fade-in">
        <div className="empty-icon">📂</div>
        <div className="empty-title">No Active Deposit Certificates Yet</div>
        <div className="empty-desc">
          Open a fixed-term deposit on the left panel to mint your first ERC721 Certificate NFT.
        </div>
      </div>
    );
  }

  return (
    <div className="deposit-list-container">
      <div className="panel-header" style={{ marginBottom: "16px" }}>
        <div className="panel-title">
          <span className="panel-title-icon">📜</span>
          My Deposit Certificates ({myDeposits.length})
        </div>
        <span className="badge badge-network">ERC721 TOKENS</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {myDeposits.map((deposit) => (
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