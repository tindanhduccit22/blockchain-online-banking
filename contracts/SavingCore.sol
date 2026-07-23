// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IVaultManager.sol";

contract SavingCore is ERC721, Ownable, Pausable {
    using SafeERC20 for IERC20;

    enum DepositStatus {
        ACTIVE,
        WITHDRAWN,
        MANUAL_RENEWED,
        AUTO_RENEWED
    }

    struct SavingPlan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }

    struct Deposit {
        uint256 principal;
        uint256 planId;
        uint256 openedAt;
        uint256 maturityAt;
        uint256 tenorDays;
        uint256 aprBpsAtOpen;
        uint256 penaltyBpsAtOpen;
        DepositStatus status;
        bool autoRenew;
    }

    // Personal variant: A = 0, B = 2
    uint256 public constant GRACE_PERIOD = 2 days;
    uint256 public constant DEFAULT_APR_BPS = 200;
    uint256 public constant DEFAULT_PENALTY_BPS = 400;
    uint256 public constant DEFAULT_TENOR_DAYS = 90;

    IERC20 public immutable token;
    IVaultManager public immutable vaultManager;

    uint256 public nextPlanId;
    uint256 public nextDepositId;

    mapping(uint256 => SavingPlan) private savingPlans;
    mapping(uint256 => Deposit) private deposits;

    event PlanCreated(
        uint256 indexed planId,
        uint256 tenorDays,
        uint256 aprBps
    );

    event PlanUpdated(uint256 indexed planId, uint256 newAprBps);

    event PlanStatusChanged(uint256 indexed planId, bool enabled);

    event DepositOpened(
        uint256 indexed depositId,
        address indexed depositor,
        uint256 indexed planId,
        uint256 principal,
        uint256 maturityAt,
        uint256 aprBpsAtOpen
    );
    event Withdrawn(
        uint256 indexed depositId,
        address indexed owner,
        uint256 principal,
        uint256 interest,
        bool isEarly
    );
    event DepositWithdrawn(
        uint256 indexed depositId,
        address indexed receiver,
        uint256 principal,
        uint256 interest
    );

    event DepositWithdrawnEarly(
        uint256 indexed depositId,
        address indexed receiver,
        uint256 principal,
        uint256 penalty,
        uint256 amountReceived
    );

    event AutoRenewUpdated(uint256 indexed depositId, bool enabled);

    event DepositRenewed(
        uint256 indexed depositId,
        uint256 oldMaturityAt,
        uint256 newMaturityAt,
        uint256 interestAdded,
        uint256 newPrincipal
    );

    event DepositManuallyRenewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        address indexed owner,
        uint256 newPlanId,
        uint256 oldPrincipal,
        uint256 interestAdded,
        uint256 newPrincipal
    );
    event Renewed(
        uint256 indexed oldDepositId,
        uint256 indexed newDepositId,
        uint256 newPrincipal,
        uint256 newPlanId
    );

    constructor(
        address tokenAddress,
        address vaultManagerAddress
    ) Ownable(msg.sender) ERC721("Saving Deposit Certificate", "SDC") {
        require(tokenAddress != address(0), "Invalid token address");

        require(
            vaultManagerAddress != address(0),
            "Invalid VaultManager address"
        );

        token = IERC20(tokenAddress);

        vaultManager = IVaultManager(vaultManagerAddress);
    }

    // ==========================================
    // SAVING PLAN MANAGEMENT
    // ==========================================
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 earlyWithdrawPenaltyBps
    ) external onlyOwner returns (uint256) {
        require(tenorDays > 0, "Invalid tenor");

        require(aprBps <= 10000, "Invalid APR");

        require(earlyWithdrawPenaltyBps <= 10000, "Invalid penalty");

        require(
            maxDeposit == 0 || minDeposit == 0 || maxDeposit >= minDeposit,
            "Invalid deposit limits"
        );

        uint256 planId = nextPlanId;

        savingPlans[planId] = SavingPlan({
            tenorDays: tenorDays,
            aprBps: aprBps,
            minDeposit: minDeposit,
            maxDeposit: maxDeposit,
            earlyWithdrawPenaltyBps: earlyWithdrawPenaltyBps,
            enabled: true
        });

        nextPlanId++;

        emit PlanCreated(planId, tenorDays, aprBps);

        return planId;
    }

    function updatePlan(uint256 planId, uint256 newAprBps) external onlyOwner {
        require(planId < nextPlanId, "Plan does not exist");

        require(newAprBps <= 10000, "Invalid APR");

        savingPlans[planId].aprBps = newAprBps;

        emit PlanUpdated(planId, newAprBps);
    }

    function enablePlan(uint256 planId) external onlyOwner {
        require(planId < nextPlanId, "Plan does not exist");

        savingPlans[planId].enabled = true;

        emit PlanStatusChanged(planId, true);
    }

    function disablePlan(uint256 planId) external onlyOwner {
        require(planId < nextPlanId, "Plan does not exist");

        savingPlans[planId].enabled = false;

        emit PlanStatusChanged(planId, false);
    }

    // ==========================================
    // DEPOSIT
    // ==========================================

    function openDeposit(
        uint256 planId,
        uint256 amount
    ) external whenNotPaused returns (uint256) {
        require(planId < nextPlanId, "Plan does not exist");

        SavingPlan memory plan = savingPlans[planId];

        require(plan.enabled, "Plan is disabled");

        require(amount > 0, "Amount must be greater than zero");

        if (plan.minDeposit > 0) {
            require(amount >= plan.minDeposit, "Below minimum deposit");
        }

        if (plan.maxDeposit > 0) {
            require(amount <= plan.maxDeposit, "Above maximum deposit");
        }

        uint256 depositId = nextDepositId;

        uint256 openedAt = block.timestamp;

        uint256 maturityAt = openedAt + (plan.tenorDays * 1 days);

        deposits[depositId] = Deposit({
            principal: amount,
            planId: planId,
            openedAt: openedAt,
            maturityAt: maturityAt,
            tenorDays: plan.tenorDays,
            aprBpsAtOpen: plan.aprBps,
            penaltyBpsAtOpen: plan.earlyWithdrawPenaltyBps,
            status: DepositStatus.ACTIVE,
            // Auto-renew is disabled by default
            autoRenew: false
        });

        nextDepositId++;

        token.safeTransferFrom(msg.sender, address(this), amount);

        _safeMint(msg.sender, depositId);

        emit DepositOpened(
            depositId,
            msg.sender,
            planId,
            amount,
            maturityAt,
            plan.aprBps
        );

        return depositId;
    }

    // ==========================================
    // AUTO RENEW CONFIGURATION
    // ==========================================

    function setAutoRenew(
        uint256 depositId,
        bool enabled
    ) external whenNotPaused {
        require(depositId < nextDepositId, "Deposit does not exist");

        Deposit storage deposit = deposits[depositId];

        require(
            deposit.status == DepositStatus.ACTIVE,
            "Deposit is not active"
        );

        require(ownerOf(depositId) == msg.sender, "Not deposit owner");

        require(
            block.timestamp < deposit.maturityAt + GRACE_PERIOD,
            "Auto-renew configuration period ended"
        );

        deposit.autoRenew = enabled;

        emit AutoRenewUpdated(depositId, enabled);
    }

    function processAutoRenew(uint256 depositId) external whenNotPaused {
        require(depositId < nextDepositId, "Deposit does not exist");

        Deposit storage deposit = deposits[depositId];

        require(
            deposit.status == DepositStatus.ACTIVE,
            "Deposit is not active"
        );

        require(deposit.autoRenew, "Auto-renew is disabled");

        // Must wait until the 2-day grace period has ended
        require(
            block.timestamp >= deposit.maturityAt + GRACE_PERIOD,
            "Grace period not ended"
        );

        // Must process before the renewal window expires
        require(
            block.timestamp <
                deposit.maturityAt +
                    GRACE_PERIOD +
                    (deposit.tenorDays * 1 days),
            "Renewal window missed"
        );

        uint256 oldMaturityAt = deposit.maturityAt;

        uint256 interest = calculateInterest(
            deposit.principal,
            deposit.aprBpsAtOpen,
            deposit.tenorDays
        );

        uint256 newPrincipal = deposit.principal + interest;

        if (interest > 0) {
            vaultManager.payoutInterest(address(this), interest);
        }

        deposit.principal = newPrincipal;

        deposit.openedAt = oldMaturityAt;

        deposit.maturityAt = oldMaturityAt + (deposit.tenorDays * 1 days);

        emit DepositRenewed(
            depositId,
            oldMaturityAt,
            deposit.maturityAt,
            interest,
            newPrincipal
        );
    }

    function renewDeposit(
        uint256 depositId,
        uint256 newPlanId
    ) external whenNotPaused returns (uint256) {
        require(depositId < nextDepositId, "Deposit does not exist");

        require(newPlanId < nextPlanId, "Plan does not exist");

        Deposit storage oldDeposit = deposits[depositId];

        require(
            oldDeposit.status == DepositStatus.ACTIVE,
            "Deposit is not active"
        );

        require(ownerOf(depositId) == msg.sender, "Not deposit owner");

        require(
            block.timestamp >= oldDeposit.maturityAt,
            "Deposit has not matured"
        );

        SavingPlan memory newPlan = savingPlans[newPlanId];

        require(newPlan.enabled, "Plan is disabled");

        uint256 interest = calculateInterest(
            oldDeposit.principal,
            oldDeposit.aprBpsAtOpen,
            oldDeposit.tenorDays
        );

        uint256 oldPrincipal = oldDeposit.principal;

        uint256 newPrincipal = oldPrincipal + interest;

        if (newPlan.minDeposit > 0) {
            require(
                newPrincipal >= newPlan.minDeposit,
                "Below minimum deposit"
            );
        }

        if (newPlan.maxDeposit > 0) {
            require(
                newPrincipal <= newPlan.maxDeposit,
                "Above maximum deposit"
            );
        }

        // Interest must come from VaultManager.
        // Principal is already held by SavingCore.
        if (interest > 0) {
            vaultManager.payoutInterest(address(this), interest);
        }

        // Close the old deposit as manually renewed.
        oldDeposit.status = DepositStatus.MANUAL_RENEWED;

        oldDeposit.autoRenew = false;

        uint256 newDepositId = nextDepositId;

        uint256 openedAt = block.timestamp;

        uint256 maturityAt = openedAt + (newPlan.tenorDays * 1 days);

        deposits[newDepositId] = Deposit({
            principal: newPrincipal,
            planId: newPlanId,
            openedAt: openedAt,
            maturityAt: maturityAt,
            tenorDays: newPlan.tenorDays,
            aprBpsAtOpen: newPlan.aprBps,
            penaltyBpsAtOpen: newPlan.earlyWithdrawPenaltyBps,
            status: DepositStatus.ACTIVE,
            autoRenew: false
        });

        nextDepositId++;

        _safeMint(msg.sender, newDepositId);

        emit DepositManuallyRenewed(
            depositId,
            newDepositId,
            msg.sender,
            newPlanId,
            oldPrincipal,
            interest,
            newPrincipal
        );

        emit DepositOpened(
            newDepositId,
            msg.sender,
            newPlanId,
            newPrincipal,
            maturityAt,
            newPlan.aprBps
        );

        return newDepositId;
    }

    // ==========================================
    // MATURE WITHDRAWAL
    // ==========================================

    function withdrawAtMaturity(uint256 depositId) external whenNotPaused {
        require(depositId < nextDepositId, "Deposit does not exist");

        Deposit storage deposit = deposits[depositId];

        require(
            deposit.status == DepositStatus.ACTIVE,
            "Deposit is not active"
        );

        require(ownerOf(depositId) == msg.sender, "Not deposit owner");

        require(
            block.timestamp >= deposit.maturityAt,
            "Deposit has not matured"
        );

        uint256 interest = calculateInterest(
            deposit.principal,
            deposit.aprBpsAtOpen,
            deposit.tenorDays
        );

        uint256 principal = deposit.principal;

        // Effects before interactions
        deposit.status = DepositStatus.WITHDRAWN;

        // Principal comes from SavingCore
        token.safeTransfer(msg.sender, principal);

        // Interest comes from VaultManager
        if (interest > 0) {
            vaultManager.payoutInterest(msg.sender, interest);
        }

        emit DepositWithdrawn(depositId, msg.sender, principal, interest);
    }

    // ==========================================
    // EARLY WITHDRAWAL
    // ==========================================

    function withdrawEarly(uint256 depositId) external whenNotPaused {
        require(depositId < nextDepositId, "Deposit does not exist");

        Deposit storage deposit = deposits[depositId];

        require(
            deposit.status == DepositStatus.ACTIVE,
            "Deposit is not active"
        );

        require(ownerOf(depositId) == msg.sender, "Not deposit owner");

        require(
            block.timestamp < deposit.maturityAt,
            "Deposit already matured"
        );

        uint256 principal = deposit.principal;

        uint256 penalty = calculatePenalty(principal, deposit.penaltyBpsAtOpen);

        uint256 amountReceived = principal - penalty;

        // Effects before interactions
        deposit.status = DepositStatus.WITHDRAWN;

        // Principal minus penalty
        token.safeTransfer(msg.sender, amountReceived);

        // Penalty goes to fee receiver
        if (penalty > 0) {
            token.safeTransfer(vaultManager.feeReceiver(), penalty);
        }

        emit DepositWithdrawnEarly(
            depositId,
            msg.sender,
            principal,
            penalty,
            amountReceived
        );
        emit Withdrawn(depositId, msg.sender, principal, 0, true);
    }

    // ==========================================
    // GETTERS
    // ==========================================

    function getPlan(uint256 planId) external view returns (SavingPlan memory) {
        require(planId < nextPlanId, "Plan does not exist");

        return savingPlans[planId];
    }

    function getDeposit(
        uint256 depositId
    ) external view returns (Deposit memory) {
        require(depositId < nextDepositId, "Deposit does not exist");

        return deposits[depositId];
    }

    // ==========================================
    // CALCULATIONS
    // ==========================================

    function calculateInterest(
        uint256 principal,
        uint256 aprBps,
        uint256 tenorDays
    ) public pure returns (uint256) {
        return (principal * aprBps * tenorDays) / (10000 * 365);
    }

    function calculatePenalty(
        uint256 principal,
        uint256 penaltyBps
    ) public pure returns (uint256) {
        return (principal * penaltyBps) / 10000;
    }
}
