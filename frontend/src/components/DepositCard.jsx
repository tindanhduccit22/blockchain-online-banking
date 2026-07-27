import DepositActions from "./DepositActions";

export default function DepositCard({
  deposit,
  blockTimestamp,
  depositLoading,
  handleEarlyWithdraw,
  handleMaturityWithdraw,
  handlePrincipalOnlyWithdraw,
  handleClaimPendingInterest,
  handleManualRenew,
  toggleAutoRenew,
}) {
  const isMatured = blockTimestamp >= deposit.maturityAt;
  const isClosed = deposit.status !== 0;

  // Calculate maturity progress bar %
  const totalDuration = deposit.maturityAt - deposit.openedAt;
  const elapsedTime = Math.max(0, blockTimestamp - deposit.openedAt);
  const progressPercent = totalDuration > 0
    ? Math.min(100, Math.round((elapsedTime / totalDuration) * 100))
    : 100;

  const getStatusBadge = () => {
    switch (deposit.status) {
      case 0:
        return <span className="status-pill status-pill-active">ACTIVE</span>;
      case 1:
        return <span className="status-pill status-pill-withdrawn">WITHDRAWN</span>;
      case 2:
        return <span className="status-pill status-pill-renewed">MANUAL RENEWED</span>;
      case 3:
        return <span className="status-pill status-pill-renewed">AUTO RENEWED</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`nft-card animate-fade-in ${isMatured && !isClosed ? "nft-card-matured" : ""}`}>
      <div className="nft-header">
        <div>
          <span className="nft-id">#SDC-{deposit.id.toString().padStart(3, "0")}</span>
          <h3 className="nft-title">
            Deposit Certificate NFT
          </h3>
          <span className="nft-subtitle">Plan #{deposit.planId} • {deposit.tenorDays} Days Term</span>
        </div>
        {getStatusBadge()}
      </div>

      {!isClosed && (
        <div className="progress-section">
          <div className="progress-label">
            <span>Maturity Progress</span>
            <span>
              {isMatured ? "🎉 Matured! Ready to Claim/Renew" : `${progressPercent}% Complete`}
            </span>
          </div>
          <div className="progress-bar-bg">
            <div
              className={`progress-bar-fill ${isMatured ? "progress-bar-matured" : ""}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      <div className="nft-data-grid">
        <div className="nft-data-item">
          <span>Principal Deposit</span>
          <strong style={{ color: "#34d399" }}>{deposit.principal} USDC</strong>
        </div>

        <div className="nft-data-item">
          <span>Expected Interest</span>
          <strong style={{ color: "#38bdf8" }}>+{deposit.expectedInterest} USDC</strong>
        </div>

        <div className="nft-data-item">
          <span>Locked APR</span>
          <strong>{deposit.apr}%</strong>
        </div>

        <div className="nft-data-item">
          <span>Opened Date</span>
          <strong>{new Date(deposit.openedAt * 1000).toLocaleDateString()}</strong>
        </div>

        <div className="nft-data-item">
          <span>Maturity Date</span>
          <strong>{new Date(deposit.maturityAt * 1000).toLocaleDateString()}</strong>
        </div>

        <div className="nft-data-item">
          <span>Auto-Renew</span>
          <strong style={{ color: deposit.autoRenew ? "#c084fc" : "#94a3b8" }}>
            {deposit.autoRenew ? "ENABLED ⚡" : "DISABLED"}
          </strong>
        </div>
      </div>

      <DepositActions
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
    </div>
  );
}