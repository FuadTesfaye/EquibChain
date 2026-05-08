use anchor_lang::prelude::*;

use crate::{
    state::{Pool, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64, new_authority: Pubkey)]
pub struct SetScoringAuthority<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        mut,
        seeds = [POOL_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = creator
    )]
    pub pool: Account<'info, Pool>,
}

pub fn handler(
    ctx: Context<SetScoringAuthority>,
    pool_id: u64,
    new_authority: Pubkey,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Update scoring authority
    pool.scoring_authority = new_authority;

    Ok(())
}
