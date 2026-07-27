export default function WalletCard({
  account,
  status,
  usdcBalance,
  myDepositsCount = 0,
  vaultBalance = "0",
  plan = null
}) {
  return (
    <div className="kpi-grid animate-fade-in">
      <div className="kpi-card">
        <div className="kpi-icon kpi-icon-green">
          💵
        </div>
        <div className="kpi-info">
          <label>Wallet Balance</label>
          <div className="kpi-value">
            {account ? `${parseFloat(usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC` : "--"}
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon kpi-icon-cyan">
          📜
        </div>
        <div className="kpi-info">
          <label>Active Certificates</label>
          <div className="kpi-value">
            {account ? myDepositsCount : "0"} NFT
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon kpi-icon-purple">
          📈
        </div>
        <div className="kpi-info">
          <label>Plan APR / Tenor</label>
          <div className="kpi-value">
            {plan ? `${plan.apr}% / ${plan.tenorDays}d` : "2.0% / 90d"}
          </div>
        </div>
      </div>

      <div className="kpi-card">
        <div className="kpi-icon kpi-icon-amber">
          🏦
        </div>
        <div className="kpi-info">
          <label>Vault Reserve Pool</label>
          <div className="kpi-value">
            {parseFloat(vaultBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC
          </div>
        </div>
      </div>
    </div>
  );
}