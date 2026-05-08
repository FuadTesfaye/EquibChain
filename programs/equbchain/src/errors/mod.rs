use anchor_lang::prelude::*;

#[error_code]
pub enum EqubChainError {
    #[msg("Pool already exists")]
    PoolAlreadyExists,
    #[msg("Pool does not exist")]
    PoolNotFound,
    #[msg("Pool is not in the correct state")]
    InvalidPoolState,
    #[msg("Maximum members reached")]
    MaxMembersReached,
    #[msg("Member already exists")]
    MemberAlreadyExists,
    #[msg("Member not found")]
    MemberNotFound,
    #[msg("Invalid contribution amount")]
    InvalidContributionAmount,
    #[msg("Invalid cycle duration")]
    InvalidCycleDuration,
    #[msg("Invalid max members")]
    InvalidMaxMembers,
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Member has already contributed this cycle")]
    AlreadyContributed,
    #[msg("Member has missed contribution")]
    MissedContribution,
    #[msg("Cycle not complete")]
    CycleNotComplete,
    #[msg("No eligible members for disbursement")]
    NoEligibleMembers,
    #[msg("Member has already received payout")]
    AlreadyReceivedPayout,
    #[msg("Invalid scoring authority")]
    InvalidScoringAuthority,
    #[msg("Invalid score value")]
    InvalidScore,
    #[msg("Member not active")]
    MemberNotActive,
    #[msg("Pool escrow balance insufficient")]
    InsufficientEscrowBalance,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid PDA")]
    InvalidPDA,
    #[msg("Token transfer failed")]
    TokenTransferFailed,
    #[msg("Pool cannot be closed")]
    PoolCannotClose,
    #[msg("Member cannot be slashed")]
    CannotSlashMember,
    #[msg("Pool is already paused")]
    PoolAlreadyPaused,
    #[msg("Pool is not paused")]
    PoolNotPaused,
}
