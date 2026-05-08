use anchor_lang::prelude::*;

#[account]
#[derive(Debug, PartialEq, Eq)]
pub struct Pool {
    pub creator: Pubkey,
    pub pool_id: u64,
    pub contribution_amount: u64,
    pub cycle_duration: u64,
    pub max_members: u32,
    pub current_cycle: u64,
    pub member_count: u32,
    pub pool_state: PoolState,
    pub escrow_vault: Pubkey,
    pub scoring_authority: Pubkey,
    pub created_at: i64,
    pub last_cycle_at: i64,
    pub bump: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, AnchorSerialize, AnchorDeserialize)]
pub enum PoolState {
    Forming,
    Active,
    Completed,
    Paused,
}

impl Default for PoolState {
    fn default() -> Self {
        PoolState::Forming
    }
}

#[account]
#[derive(Debug, PartialEq, Eq)]
pub struct Member {
    pub wallet: Pubkey,
    pub pool: Pubkey,
    pub ai_score: u8,
    pub contribution_history: Vec<u64>,
    pub missed_cycles: u32,
    pub total_contributed: u64,
    pub payout_received: u64,
    pub active_status: bool,
    pub joined_at: i64,
    pub last_contribution_at: i64,
    pub bump: u8,
}

impl Member {
    pub const MAX_CONTRIBUTION_HISTORY: usize = 50;
    
    pub fn add_contribution(&mut self, cycle: u64) -> Result<()> {
        if self.contribution_history.len() >= Self::MAX_CONTRIBUTION_HISTORY {
            self.contribution_history.remove(0);
        }
        self.contribution_history.push(cycle);
        self.total_contributed += self.contribution_amount;
        self.last_contribution_at = Clock::get()?.unix_timestamp;
        Ok(())
    }
    
    pub fn has_contributed_this_cycle(&self, current_cycle: u64) -> bool {
        self.contribution_history.contains(&current_cycle)
    }
    
    pub fn contribution_amount(&self) -> u64 {
        self.contribution_amount
    }
}

impl Pool {
    pub const MAX_MEMBERS: u32 = 100;
    pub const MIN_MEMBERS: u32 = 3;
    pub const MAX_CYCLE_DURATION: u64 = 30 * 24 * 60 * 60; // 30 days in seconds
    pub const MIN_CYCLE_DURATION: u64 = 1 * 24 * 60 * 60; // 1 day in seconds
    
    pub fn is_cycle_complete(&self) -> bool {
        let current_time = Clock::get().unwrap().unix_timestamp;
        let cycle_end_time = self.last_cycle_at + self.cycle_duration as i64;
        current_time >= cycle_end_time
    }
    
    pub fn can_add_member(&self) -> bool {
        self.member_count < self.max_members && self.pool_state == PoolState::Forming
    }
    
    pub fn get_next_disbursement_recipient(&self, members: &[Member]) -> Option<Pubkey> {
        if members.is_empty() {
            return None;
        }
        
        let recipients_this_cycle: Vec<Pubkey> = members
            .iter()
            .filter(|m| m.payout_received > 0 && m.payout_received <= self.current_cycle)
            .map(|m| m.wallet)
            .collect();
        
        let eligible_members: Vec<&Member> = members
            .iter()
            .filter(|m| m.active_status && !recipients_this_cycle.contains(&m.wallet))
            .collect();
        
        if eligible_members.is_empty() {
            return None;
        }
        
        let index = (self.current_cycle as usize) % eligible_members.len();
        Some(eligible_members[index].wallet)
    }
    
    pub fn calculate_pool_balance(&self, members: &[Member]) -> u64 {
        members
            .iter()
            .filter(|m| m.active_status)
            .map(|m| m.total_contributed)
            .sum::<u64>()
    }
}

pub const POOL_SEED: &str = "pool";
pub const MEMBER_SEED: &str = "member";
pub const ESCROW_SEED: &str = "escrow";
