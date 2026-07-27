export default function DepositActions({
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
  const hasPendingInterest = parseFloat(deposit.pendingInterest || 0) > 0;

  if (deposit.status !== 0) {
    if (hasPendingInterest) {
      return (
        <div className="nft-actions">
          <button
            className="btn btn-primary btn-full"
            onClick={() => handleClaimPendingInterest(deposit)}
            disabled={depositLoading}
          >
            🎁 Claim Pending Interest (+{deposit.pendingInterest} USDC)
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="nft-actions">
      {!isMatured ? (
        <>
          <button
            className={`btn ${deposit.autoRenew ? "btn-secondary" : "btn-purple"}`}
            onClick={() => toggleAutoRenew(deposit)}
            disabled={depositLoading}
          >
            {deposit.autoRenew ? "⚙️ Disable Auto-Renew" : "⚡ Enable Auto-Renew"}
          </button>

          <button
            className="btn btn-danger"
            onClick={() => handleEarlyWithdraw(deposit)}
            disabled={depositLoading}
          >
            ⚠️ Early Withdraw ({deposit.penalty}% Fee)
          </button>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <button
              className="btn btn-primary"
              onClick={() => handleMaturityWithdraw(deposit)}
              disabled={depositLoading}
            >
              💰 Withdraw All
            </button>

            <button
              className="btn btn-purple"
              onClick={() => handleManualRenew(deposit)}
              disabled={depositLoading}
            >
              🔄 Manual Renew
            </button>
          </div>
        </div>
      )}
    </div>
  );
}