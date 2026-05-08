use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{
    errors::EqubChainError,
    events::PoolCreated,
    state::{Pool, PoolState, ESCROW_SEED, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + Pool::INIT_SPACE,
        seeds = [POOL_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        init,
        payer = creator,
        token::mint = usdc_mint,
        token::authority = pool,
        seeds = [ESCROW_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    pub usdc_mint: Account<'info, Mint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<InitializePool>,
    pool_id: u64,
    contribution_amount: u64,
    cycle_duration: u64,
    max_members: u32,
) -> Result<()> {
    // Validate inputs
    require!(
        contribution_amount > 0,
        EqubChainError::InvalidContributionAmount
    );
    require!(
        cycle_duration >= Pool::MIN_CYCLE_DURATION && cycle_duration <= Pool::MAX_CYCLE_DURATION,
        EqubChainError::InvalidCycleDuration
    );
    require!(
        max_members >= Pool::MIN_MEMBERS && max_members <= Pool::MAX_MEMBERS,
        EqubChainError::InvalidMaxMembers
    );

    let pool = &mut ctx.accounts.pool;
    let escrow_vault = &ctx.accounts.escrow_vault;
    let creator = &ctx.accounts.creator;
    let clock = Clock::get()?;

    // Initialize pool
    pool.creator = creator.key();
    pool.pool_id = pool_id;
    pool.contribution_amount = contribution_amount;
    pool.cycle_duration = cycle_duration;
    pool.max_members = max_members;
    pool.current_cycle = 0;
    pool.member_count = 0;
    pool.pool_state = PoolState::Forming;
    pool.escrow_vault = escrow_vault.key();
    pool.scoring_authority = creator.key(); // Creator is initial scoring authority
    pool.created_at = clock.unix_timestamp;
    pool.last_cycle_at = clock.unix_timestamp;
    pool.bump = ctx.bumps.pool;

    // Emit event
    emit_cpi!(PoolCreated {
        pool: pool.key(),
        creator: creator.key(),
        pool_id,
        contribution_amount,
        cycle_duration,
        max_members,
        escrow_vault: escrow_vault.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
