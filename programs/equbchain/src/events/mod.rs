use anchor_lang::prelude::*;

#[event]
pub struct PoolCreated {
    pub pool: Pubkey,
    pub creator: Pubkey,
    pub pool_id: u64,
    pub contribution_amount: u64,
    pub cycle_duration: u64,
    pub max_members: u32,
    pub escrow_vault: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct MemberJoined {
    pub pool: Pubkey,
    pub member: Pubkey,
    pub wallet: Pubkey,
    pub ai_score: u8,
    pub timestamp: i64,
}

#[event]
pub struct ContributionMade {
    pub pool: Pubkey,
    pub member: Pubkey,
    pub wallet: Pubkey,
    pub amount: u64,
    pub cycle: u64,
    pub timestamp: i64,
}

#[event]
pub struct ScoreUpdated {
    pub pool: Pubkey,
    pub member: Pubkey,
    pub wallet: Pubkey,
    pub old_score: u8,
    pub new_score: u8,
    pub scoring_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct DisbursementExecuted {
    pub pool: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub cycle: u64,
    pub member_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct MemberSlashed {
    pub pool: Pubkey,
    pub member: Pubkey,
    pub wallet: Pubkey,
    pub slash_amount: u64,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct PoolPaused {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct PoolResumed {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PoolCompleted {
    pub pool: Pubkey,
    pub final_cycle: u64,
    pub total_distributed: u64,
    pub member_count: u32,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyClose {
    pub pool: Pubkey,
    pub authority: Pubkey,
    pub reason: String,
    pub remaining_balance: u64,
    pub timestamp: i64,
}
