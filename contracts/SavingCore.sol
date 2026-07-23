// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

import "./interfaces/IVaultManager.sol";

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
        uint256 maturityAt
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

    function withdrawAtMaturity(uint256 depositId) external {
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

        // Effects before external interactions
        deposit.status = DepositStatus.CLOSED;

        // Return principal from SavingCore
        token.safeTransfer(msg.sender, principal);

        // Pay interest from VaultManager
        if (interest > 0) {
            vaultManager.payoutInterest(msg.sender, interest);
        }

        emit DepositWithdrawn(depositId, msg.sender, principal, interest);
    }

    function withdrawEarly(uint256 depositId) external {
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
        deposit.status = DepositStatus.CLOSED;

        // Return remaining principal to NFT owner
        token.safeTransfer(msg.sender, amountReceived);

        // Send penalty to fee receiver
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
