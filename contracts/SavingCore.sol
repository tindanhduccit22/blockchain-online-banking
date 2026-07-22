// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract SavingCore is Ownable, ERC721 {
    using SafeERC20 for IERC20;
    enum DepositStatus {
        ACTIVE,
        CLOSED
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
    }

    uint256 public constant GRACE_PERIOD = 2 days;
    uint256 public constant DEFAULT_APR_BPS = 200;
    uint256 public constant DEFAULT_PENALTY_BPS = 400;
    uint256 public constant DEFAULT_TENOR_DAYS = 90;

    IERC20 public immutable token;

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
        uint256 maturityAt
    );

    constructor(
        address tokenAddress
    ) Ownable(msg.sender) ERC721("Saving Deposit Certificate", "SDC") {
        require(tokenAddress != address(0), "Invalid token address");

        token = IERC20(tokenAddress);
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

    function openDeposit(
        uint256 planId,
        uint256 amount
    ) external returns (uint256) {
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
            status: DepositStatus.ACTIVE
        });

        nextDepositId++;

        token.safeTransferFrom(msg.sender, address(this), amount);

        _safeMint(msg.sender, depositId);

        emit DepositOpened(depositId, msg.sender, planId, amount, maturityAt);

        return depositId;
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
}
