use anchor_lang::prelude::*;

use crate::{
    errors::EqubChainError,
    events::PoolResumed,
    state::{Pool, PoolState, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct ResumePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [POOL_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = creator
    )]
    pub pool: Account<'info, Pool>,
    
    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<ResumePool>, pool_id: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let authority = &ctx.accounts.authority;
    let clock = Clock::get()?;

    // Check if pool is paused
    require!(
        pool.pool_state == PoolState::Paused,
        EqubChainError::PoolNotPaused
    );

    // Resume the pool
    pool.pool_state = PoolState::Active;

    // Reset cycle timing to current time
    pool.last_cycle_at = clock.unix_timestamp;

    // Emit event
    emit_cpi!(PoolResumed {
        pool: pool.key(),
        authority: authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
