export default function SavingPlanCard({ plan }) {
  if (!plan) return null;

  return (
    <div className="panel-card animate-fade-in">
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">💎</span>
          Saving Plan Product #0
        </div>
        <span className={`badge ${plan.enabled ? "badge-role-user" : "badge-role-admin"}`}>
          {plan.enabled ? "ACTIVE PRODUCT" : "DISABLED"}
        </span>
      </div>

      <div className="plan-spec-grid">
        <div className="plan-spec-item">
          <label>Fixed APR Rate</label>
          <val style={{ color: "#34d399" }}>{plan.apr}% / year</val>
        </div>

        <div className="plan-spec-item">
          <label>Fixed Term Duration</label>
          <val>{plan.tenorDays} Days</val>
        </div>

        <div className="plan-spec-item">
          <label>Min / Max Limit</label>
          <val style={{ fontSize: "14px" }}>
            {plan.minDeposit} - {plan.maxDeposit} USDC
          </val>
        </div>

        <div className="plan-spec-item">
          <label>Early Penalty</label>
          <val style={{ color: "#fbbf24" }}>{plan.penalty}%</val>
        </div>
      </div>
    </div>
  );
}