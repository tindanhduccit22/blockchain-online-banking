// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SavingCore is Ownable {
    uint256 public constant BPS_DENOMINATOR = 10_000;

    IERC20 public immutable token;
    address public immutable vaultManager;

    struct SavingPlan {
        uint256 duration;
        uint256 aprBps;
        uint256 penaltyBps;
        bool active;
    }

    uint256 public nextPlanId;

    mapping(uint256 => SavingPlan) private savingPlans;

    event SavingPlanCreated(
        uint256 indexed planId,
        uint256 duration,
        uint256 aprBps,
        uint256 penaltyBps
    );

    event SavingPlanUpdated(
        uint256 indexed planId,
        uint256 duration,
        uint256 aprBps,
        uint256 penaltyBps
    );

    event SavingPlanStatusChanged(
        uint256 indexed planId,
        bool active
    );

    constructor(
        address tokenAddress,
        address vaultManagerAddress
    ) Ownable(msg.sender) {
        require(tokenAddress != address(0), "Invalid token address");
        require(
            vaultManagerAddress != address(0),
            "Invalid vault manager"
        );

        token = IERC20(tokenAddress);
        vaultManager = vaultManagerAddress;
    }

    function createPlan(
        uint256 duration,
        uint256 aprBps,
        uint256 penaltyBps
    ) external onlyOwner returns (uint256 planId) {
        _validatePlan(duration, aprBps, penaltyBps);

        planId = nextPlanId;
        nextPlanId++;

        savingPlans[planId] = SavingPlan({
            duration: duration,
            aprBps: aprBps,
            penaltyBps: penaltyBps,
            active: true
        });

        emit SavingPlanCreated(
            planId,
            duration,
            aprBps,
            penaltyBps
        );
    }

    function updatePlan(
        uint256 planId,
        uint256 duration,
        uint256 aprBps,
        uint256 penaltyBps
    ) external onlyOwner {
        require(planId < nextPlanId, "Plan does not exist");

        _validatePlan(duration, aprBps, penaltyBps);

        SavingPlan storage plan = savingPlans[planId];

        plan.duration = duration;
        plan.aprBps = aprBps;
        plan.penaltyBps = penaltyBps;

        emit SavingPlanUpdated(
            planId,
            duration,
            aprBps,
            penaltyBps
        );
    }

    function setPlanActive(
        uint256 planId,
        bool active
    ) external onlyOwner {
        require(planId < nextPlanId, "Plan does not exist");

        savingPlans[planId].active = active;

        emit SavingPlanStatusChanged(planId, active);
    }

    function getPlan(
        uint256 planId
    ) external view returns (SavingPlan memory) {
        require(planId < nextPlanId, "Plan does not exist");

        return savingPlans[planId];
    }

    function _validatePlan(
        uint256 duration,
        uint256 aprBps,
        uint256 penaltyBps
    ) internal pure {
        require(duration > 0, "Duration must be greater than zero");
        require(aprBps <= BPS_DENOMINATOR, "APR exceeds maximum");
        require(
            penaltyBps <= BPS_DENOMINATOR,
            "Penalty exceeds maximum"
        );
    }
}