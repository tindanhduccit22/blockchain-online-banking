export const SAVING_CORE_ABI = [
    "function getPlan(uint256 planId) external view returns (tuple(uint256 tenorDays, uint256 aprBps, uint256 minDeposit, uint256 maxDeposit, uint256 earlyWithdrawPenaltyBps, bool enabled))",

    "function openDeposit(uint256 planId, uint256 amount) external returns (uint256)",

    "function nextDepositId() external view returns (uint256)",

    "function ownerOf(uint256 tokenId) external view returns (address)",

    "function getDeposit(uint256 depositId) external view returns (tuple(uint256 principal, uint256 planId, uint256 openedAt, uint256 maturityAt, uint256 tenorDays, uint256 aprBpsAtOpen, uint256 penaltyBpsAtOpen, uint8 status, bool autoRenew))",

    "function calculateInterest(uint256 principal, uint256 aprBps, uint256 tenorDays) external pure returns (uint256)",

    "function withdrawEarly(uint256 depositId) external",

    "function withdrawAtMaturity(uint256 depositId) external",

    "function renewDeposit(uint256 depositId, uint256 newPlanId) external returns (uint256)",

    "function setAutoRenew(uint256 depositId, bool enabled) external",
];