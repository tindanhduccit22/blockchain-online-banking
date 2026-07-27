export default function DepositForm({
  account,
  plan,
  depositAmount,
  setDepositAmount,
  approveUSDC,
  openDeposit,
  loading,
  transactionStatus,
}) {
  if (!account || !plan) return null;

  const numAmount = parseFloat(depositAmount) || 0;
  const numApr = plan ? parseFloat(plan.apr) : 2.0;
  const numDays = plan ? parseInt(plan.tenorDays) : 90;

  // Simple interest calculation: (Principal * APR * Days) / (365 * 100)
  const estimatedInterest = ((numAmount * numApr * numDays) / (365 * 100)).toFixed(4);
  const totalReturn = (numAmount + parseFloat(estimatedInterest)).toFixed(4);

  const presets = [10, 100, 500, 1000, 5000];

  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">🔒</span>
          Open Term Deposit
        </div>
        <span className="badge badge-network">ERC721 Certificate</span>
      </div>

      <div className="form-group">
        <div className="form-label">
          <span>Deposit Amount</span>
          <span>Limits: {plan.minDeposit} - {plan.maxDeposit} USDC</span>
        </div>

        <div className="form-input-wrapper">
          <input
            className="form-input"
            type="number"
            value={depositAmount}
            min={plan.minDeposit}
            max={plan.maxDeposit}
            step="10"
            onChange={(e) => setDepositAmount(e.target.value)}
            placeholder="500"
          />
          <span className="input-suffix">USDC</span>
        </div>

        <div className="preset-buttons">
          {presets.map((val) => (
            <button
              key={val}
              type="button"
              className="btn-preset"
              onClick={() => setDepositAmount(val.toString())}
            >
              ${val}
            </button>
          ))}
        </div>
      </div>

      {/* Live ROI Calculator Box */}
      <div className="roi-calculator">
        <div className="roi-row">
          <span className="roi-label">Deposit Term</span>
          <span className="roi-value">{numDays} Days (@ {numApr}% APR)</span>
        </div>
        <div className="roi-row">
          <span className="roi-label">Est. Interest Yield</span>
          <span className="roi-value" style={{ color: "#34d399" }}>+ {estimatedInterest} USDC</span>
        </div>
        <div className="roi-row">
          <span className="roi-label">Total Payout at Maturity</span>
          <span className="roi-value-highlight">{totalReturn} USDC</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <button
          className="btn btn-primary btn-full"
          onClick={approveUSDC}
          disabled={loading}
        >
          {loading ? "Processing..." : "1. Approve USDC"}
        </button>

        <button
          className="btn btn-primary btn-full"
          onClick={openDeposit}
          disabled={loading}
        >
          {loading ? "Processing..." : "2. Open Deposit"}
        </button>
      </div>

      {transactionStatus && (
        <div className={`status-msg ${transactionStatus.toLowerCase().includes("failed") || transactionStatus.toLowerCase().includes("reverted") ? "status-msg-info" : "status-msg-success"}`}>
          {transactionStatus}
        </div>
      )}
    </div>
  );
}