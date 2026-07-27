import WalletCard from "../components/WalletCard";
import MintCard from "../components/MintCard";
import SavingPlanCard from "../components/SavingPlanCard";
import DepositForm from "../components/DepositForm";
import DepositList from "../components/DepositList";

function UserDashboard(props) {
  return (
    <>
      <WalletCard
        account={props.account}
        status={props.status}
        usdcBalance={props.usdcBalance}
        myDepositsCount={props.myDeposits ? props.myDeposits.length : 0}
        vaultBalance={props.vaultBalance}
        plan={props.plan}
      />

      <div className="dashboard-grid">
        {/* Left Column: Plan, Form, Faucet */}
        <div>
          <SavingPlanCard plan={props.plan} />

          <DepositForm
            account={props.account}
            plan={props.plan}
            depositAmount={props.depositAmount}
            setDepositAmount={props.setDepositAmount}
            approveUSDC={() => props.approveUSDC(props.depositAmount)}
            openDeposit={() => props.openDeposit(props.depositAmount, props.usdcBalance)}
            loading={props.depositLoading || props.approving}
            transactionStatus={props.transactionStatus}
          />

          <MintCard
            account={props.account}
            mintAmount={props.mintAmount}
            setMintAmount={props.setMintAmount}
            onMint={props.handleMint}
            loading={props.depositLoading}
          />
        </div>

        {/* Right Column: Active Certificates */}
        <div>
          <DepositList
            myDeposits={props.myDeposits}
            blockTimestamp={props.blockTimestamp}
            depositLoading={props.depositLoading}
            handleEarlyWithdraw={props.handleEarlyWithdraw}
            handleMaturityWithdraw={props.handleMaturityWithdraw}
            handlePrincipalOnlyWithdraw={props.handlePrincipalOnlyWithdraw}
            handleClaimPendingInterest={props.handleClaimPendingInterest}
            handleManualRenew={props.handleManualRenew}
            toggleAutoRenew={props.toggleAutoRenew}
          />
        </div>
      </div>
    </>
  );
}

export default UserDashboard;