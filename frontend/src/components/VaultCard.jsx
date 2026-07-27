export default function VaultCard({
  vaultBalance,
  reservedInterest,
  vaultAmount,
  setVaultAmount,
  withdrawVaultAmount,
  setWithdrawVaultAmount,
  approveVault,
  withdrawVault,
  loading,
}) {
  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">🏦</span>
          Vault Reserve Treasury & Solvency Guard (C2)
        </div>
        <span className="badge badge-role-admin">SOLVENCY LIQUIDITY</span>
      </div>

      <div className="roi-calculator" style={{ background: "rgba(245, 158, 11, 0.08)", borderColor: "rgba(245, 158, 11, 0.3)", marginBottom: "20px" }}>
        <div className="roi-row">
          <span className="roi-label">Vault Pool Balance</span>
          <span className="roi-value-highlight" style={{ color: "#fbbf24" }}>
            {parseFloat(vaultBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
          </span>
        </div>
        <div className="roi-row">
          <span className="roi-label">Promised Interest Reserved (C2)</span>
          <span className="roi-value" style={{ color: "#38bdf8", fontWeight: 700 }}>
            {parseFloat(reservedInterest).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
          </span>
        </div>
        <div className="roi-row" style={{ borderTop: "1px solid rgba(255, 255, 255, 0.06)", paddingTop: "8px", marginTop: "8px" }}>
          <span className="roi-label">Max Admin Solvency Withdrawal</span>
          <span className="roi-value" style={{ color: "#34d399", fontWeight: 700 }}>
            {Math.max(0, (parseFloat(vaultBalance) - parseFloat(reservedInterest))).toFixed(2)} USDC
          </span>
        </div>
      </div>

      {/* Fund Vault Section */}
      <div className="form-group">
        <div className="form-label">
          <span>Fund Vault Amount</span>
          <span>Deposit Liquidity Pool</span>
        </div>

        <div className="form-input-wrapper">
          <input
            className="form-input"
            type="number"
            value={vaultAmount}
            onChange={(e) => setVaultAmount(e.target.value)}
          />
          <span className="input-suffix">USDC</span>
        </div>

        <button
          className="btn btn-primary btn-full"
          onClick={approveVault}
          disabled={loading}
          style={{ marginTop: "10px" }}
        >
          {loading ? "Processing..." : "⚡ Fund Interest Vault Pool"}
        </button>
      </div>

      <hr style={{ borderColor: "var(--border-color)", margin: "20px 0" }} />

      {/* Withdraw Vault Section (C2 Solvency Guard Test) */}
      <div className="form-group">
        <div className="form-label">
          <span>Withdraw Vault Amount</span>
          <span>Test C2 Solvency Guard</span>
        </div>

        <div className="form-input-wrapper">
          <input
            className="form-input"
            type="number"
            value={withdrawVaultAmount}
            onChange={(e) => setWithdrawVaultAmount(e.target.value)}
          />
          <span className="input-suffix">USDC</span>
        </div>

        <button
          className="btn btn-danger btn-full"
          onClick={withdrawVault}
          disabled={loading}
          style={{ marginTop: "10px" }}
        >
          {loading ? "Processing..." : "💸 Withdraw Vault (C2 Guard Test)"}
        </button>
      </div>
    </div>
  );
}