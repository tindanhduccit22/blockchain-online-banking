// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SavingCore is Ownable {
    struct SavingPlan {
        uint256 tenorDays;
        uint256 aprBps;
        uint256 minDeposit;
        uint256 maxDeposit;
        uint256 earlyWithdrawPenaltyBps;
        bool enabled;
    }

    uint256 public constant GRACE_PERIOD = 2 days;
    uint256 public constant DEFAULT_APR_BPS = 200;
    uint256 public constant DEFAULT_PENALTY_BPS = 400;
    uint256 public constant DEFAULT_TENOR_DAYS = 90;

    uint256 public nextPlanId;

    mapping(uint256 => SavingPlan) private savingPlans;

    event PlanCreated(
        uint256 indexed planId,
        uint256 tenorDays,
        uint256 aprBps
    );

    event PlanUpdated(
        uint256 indexed planId,
        uint256 newAprBps
    );

    event PlanStatusChanged(
        uint256 indexed planId,
        bool enabled
    );

    constructor() Ownable(msg.sender) {}

    function createPlan(
        uint256 tenorDays,
        uint256 aprBps,
        uint256 minDeposit,
        uint256 maxDeposit,
        uint256 earlyWithdrawPenaltyBps
    ) external onlyOwner returns (uint256) {
        require(tenorDays > 0, "Invalid tenor");
        require(aprBps <= 10000, "Invalid APR");
        require(
            earlyWithdrawPenaltyBps <= 10000,
            "Invalid penalty"
        );

        require(
            maxDeposit == 0 ||
            minDeposit == 0 ||
            maxDeposit >= minDeposit,
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

        emit PlanCreated(
            planId,
            tenorDays,
            aprBps
        );

        return planId;
    }

    function updatePlan(
        uint256 planId,
        uint256 newAprBps
    ) external onlyOwner {
        require(
            planId < nextPlanId,
            "Plan does not exist"
        );

        require(
            newAprBps <= 10000,
            "Invalid APR"
        );

        savingPlans[planId].aprBps = newAprBps;

        emit PlanUpdated(
            planId,
            newAprBps
        );
    }

    function enablePlan(
        uint256 planId
    ) external onlyOwner {
        require(
            planId < nextPlanId,
            "Plan does not exist"
        );

        savingPlans[planId].enabled = true;

        emit PlanStatusChanged(
            planId,
            true
        );
    }

    function disablePlan(
        uint256 planId
    ) external onlyOwner {
        require(
            planId < nextPlanId,
            "Plan does not exist"
        );

        savingPlans[planId].enabled = false;

        emit PlanStatusChanged(
            planId,
            false
        );
    }

    function getPlan(
        uint256 planId
    ) external view returns (SavingPlan memory) {
        require(
            planId < nextPlanId,
            "Plan does not exist"
        );

        return savingPlans[planId];
    }
}