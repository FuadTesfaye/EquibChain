use anchor_lang::prelude::*;

use crate::{
    errors::EqubChainError,
    events::PoolPaused,
    state::{Pool, PoolState, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct PausePool<'info> {
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

pub fn handler(ctx: Context<PausePool>, pool_id: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let authority = &ctx.accounts.authority;
    let clock = Clock::get()?;

    // Check if pool is already paused
    require!(
        pool.pool_state != PoolState::Paused,
        EqubChainError::PoolAlreadyPaused
    );

    // Only allow pausing active pools
    require!(
        pool.pool_state == PoolState::Active,
        EqubChainError::InvalidPoolState
    );

    // Pause the pool
    pool.pool_state = PoolState::Paused;

    // Emit event
    emit_cpi!(PoolPaused {
        pool: pool.key(),
        authority: authority.key(),
        reason: "Manual pause by authority".to_string(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
