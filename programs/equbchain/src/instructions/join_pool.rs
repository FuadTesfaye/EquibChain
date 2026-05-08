use anchor_lang::prelude::*;
use anchor_spl::associated_token::AssociatedToken;

use crate::{
    errors::EqubChainError,
    events::MemberJoined,
    state::{Member, Pool, PoolState, MEMBER_SEED, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct JoinPool<'info> {
    #[account(mut)]
    pub member: Signer<'info>,
    
    #[account(
        mut,
        seeds = [POOL_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = creator
    )]
    pub pool: Account<'info, Pool>,
    
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = member,
        space = 8 + Member::INIT_SPACE,
        seeds = [MEMBER_SEED.as_bytes(), pool.key().as_ref(), member.key().as_ref()],
        bump
    )]
    pub member_account: Account<'info, Member>,
    
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<JoinPool>, pool_id: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let member_account = &mut ctx.accounts.member_account;
    let member = &ctx.accounts.member;
    let clock = Clock::get()?;

    // Validate pool state
    require!(
        pool.pool_state == PoolState::Forming,
        EqubChainError::InvalidPoolState
    );
    
    // Check if pool can accept more members
    require!(
        pool.can_add_member(),
        EqubChainError::MaxMembersReached
    );

    // Initialize member account
    member_account.wallet = member.key();
    member_account.pool = pool.key();
    member_account.ai_score = 50; // Default neutral score
    member_account.contribution_history = Vec::new();
    member_account.missed_cycles = 0;
    member_account.total_contributed = 0;
    member_account.payout_received = 0;
    member_account.active_status = true;
    member_account.joined_at = clock.unix_timestamp;
    member_account.last_contribution_at = 0;
    member_account.bump = ctx.bumps.member_account;

    // Update pool member count
    pool.member_count += 1;

    // Check if pool should transition to Active state
    if pool.member_count >= Pool::MIN_MEMBERS {
        pool.pool_state = PoolState::Active;
        pool.current_cycle = 1;
        pool.last_cycle_at = clock.unix_timestamp;
    }

    // Emit event
    emit_cpi!(MemberJoined {
        pool: pool.key(),
        member: member_account.key(),
        wallet: member.key(),
        ai_score: member_account.ai_score,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
