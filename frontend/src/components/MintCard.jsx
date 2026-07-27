export default function MintCard({
  account,
  mintAmount,
  setMintAmount,
  onMint,
  loading,
}) {
  if (!account) return null;

  return (
    <div className="panel-card animate-fade-in" style={{ marginBottom: "20px" }}>
      <div className="panel-header">
        <div className="panel-title">
          <span className="panel-title-icon">🚰</span>
          Testnet Faucet (MockUSDC)
        </div>
        <span className="badge badge-network">6 Decimals</span>
      </div>

      <div className="form-group">
        <div className="form-label">
          <span>Amount to Mint</span>
          <span>Limits: 10 - 10,000 USDC</span>
        </div>

        <div className="form-input-wrapper">
          <input
            className="form-input"
            type="number"
            value={mintAmount}
            min="10"
            max="10000"
            onChange={(e) => setMintAmount(e.target.value)}
          />
          <span className="input-suffix">USDC</span>
        </div>

        <div className="preset-buttons">
          <button
            type="button"
            className="btn-preset"
            onClick={() => setMintAmount("100")}
          >
            +$100
          </button>
          <button
            type="button"
            className="btn-preset"
            onClick={() => setMintAmount("1000")}
          >
            +$1,000
          </button>
          <button
            type="button"
            className="btn-preset"
            onClick={() => setMintAmount("10000")}
          >
            +$10,000
          </button>
        </div>
      </div>

      <button
        className="btn btn-outline-primary btn-full"
        onClick={onMint}
        disabled={loading}
      >
        {loading ? "Minting Tokens..." : "Mint MockUSDC to Wallet"}
      </button>
    </div>
  );
}