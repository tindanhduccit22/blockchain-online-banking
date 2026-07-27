import VaultCard from "../components/VaultCard";

export default function AdminPanel(props) {
  return (
    <div className="admin-container animate-fade-in">
      <div className="panel-card" style={{ marginBottom: "24px" }}>
        <div className="panel-header">
          <div className="panel-title">
            <span className="panel-title-icon">👑</span>
            Administrator Control Center
          </div>
          <span className="badge badge-role-admin">ADMIN PRIVILEGES</span>
        </div>

        <div className="kpi-grid" style={{ marginBottom: "0" }}>
          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-amber">💼</div>
            <div className="kpi-info">
              <label>Admin Wallet Balance</label>
              <div className="kpi-value">
                {parseFloat(props.adminBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-purple">🏛️</div>
            <div className="kpi-info">
              <label>Vault Interest Pool</label>
              <div className="kpi-value">
                {parseFloat(props.vaultBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
              </div>
            </div>
          </div>

          <div className="kpi-card">
            <div className="kpi-icon kpi-icon-cyan">🛡️</div>
            <div className="kpi-info">
              <label>Reserved Interest Pool</label>
              <div className="kpi-value">
                {parseFloat(props.reservedInterest || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column: Admin Faucet */}
        <div className="panel-card">
          <div className="panel-header">
            <div className="panel-title">
              <span className="panel-title-icon">🚰</span>
              Admin Treasury Mint
            </div>
            <span className="badge badge-network">MockUSDC</span>
          </div>

          <div className="form-group">
            <div className="form-label">
              <span>Mint Amount</span>
              <span>For Bank Liquidity</span>
            </div>

            <div className="form-input-wrapper">
              <input
                className="form-input"
                value={props.mintAmount}
                onChange={(e) => props.setMintAmount(e.target.value)}
              />
              <span className="input-suffix">USDC</span>
            </div>
          </div>

          <button
            className="btn btn-purple btn-full"
            onClick={() => props.mintAdmin(props.account)}
          >
            🪙 Mint Tokens to Admin Wallet
          </button>
        </div>

        {/* Right Column: Vault Manager */}
        <div>
          <VaultCard
            vaultBalance={props.vaultBalance}
            reservedInterest={props.reservedInterest}
            vaultAmount={props.vaultAmount}
            setVaultAmount={props.setVaultAmount}
            withdrawVaultAmount={props.withdrawVaultAmount}
            setWithdrawVaultAmount={props.setWithdrawVaultAmount}
            approveVault={props.approveVault}
            withdrawVault={props.withdrawVault}
            loading={props.depositLoading}
          />
        </div>
      </div>
    </div>
  );
}