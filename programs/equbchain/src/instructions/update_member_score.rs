use anchor_lang::prelude::*;

use crate::{
    errors::EqubChainError,
    events::ScoreUpdated,
    state::{Member, Pool, MEMBER_SEED, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64, member: Pubkey, new_score: u8)]
pub struct UpdateMemberScore<'info> {
    #[account(mut)]
    pub scoring_authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [POOL_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = scoring_authority
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        mut,
        seeds = [MEMBER_SEED.as_bytes(), pool.key().as_ref(), member.as_ref()],
        bump = member_account.bump
    )]
    pub member_account: Account<'info, Member>,
}

pub fn handler(
    ctx: Context<UpdateMemberScore>,
    pool_id: u64,
    member: Pubkey,
    new_score: u8,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let member_account = &mut ctx.accounts.member_account;
    let scoring_authority = &ctx.accounts.scoring_authority;
    let clock = Clock::get()?;

    // Validate score range (0-100)
    require!(new_score <= 100, EqubChainError::InvalidScore);

    // Store old score for event
    let old_score = member_account.ai_score;

    // Update member score
    member_account.ai_score = new_score;

    // Emit event
    emit_cpi!(ScoreUpdated {
        pool: pool.key(),
        member: member_account.key(),
        wallet: member,
        old_score,
        new_score,
        scoring_authority: scoring_authority.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
