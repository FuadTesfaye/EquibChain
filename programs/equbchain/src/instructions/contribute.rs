use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    errors::EqubChainError,
    events::ContributionMade,
    state::{Member, Pool, PoolState, MEMBER_SEED, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct Contribute<'info> {
    #[account(mut)]
    pub member: Signer<'info>,
    
    #[account(
        mut,
        seeds = [POOL_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump = pool.bump
    )]
    pub pool: Account<'info, Pool>,
    
    #[account(
        mut,
        seeds = [MEMBER_SEED.as_bytes(), pool.key().as_ref(), member.key().as_ref()],
        bump = member_account.bump,
        has_one = wallet = member
    )]
    pub member_account: Account<'info, Member>,
    
    #[account(
        init_if_needed,
        payer = member,
        associated_token::mint = usdc_mint,
        associated_token::authority = member
    )]
    pub member_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = ["escrow".as_bytes(), &pool_id.to_le_bytes()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    pub usdc_mint: Account<'info, Mint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<Contribute>, pool_id: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let member_account = &mut ctx.accounts.member_account;
    let member = &ctx.accounts.member;
    let clock = Clock::get()?;

    // Validate pool state
    require!(
        pool.pool_state == PoolState::Active,
        EqubChainError::InvalidPoolState
    );

    // Check if member is active
    require!(
        member_account.active_status,
        EqubChainError::MemberNotActive
    );

    // Check if member has already contributed this cycle
    require!(
        !member_account.has_contributed_this_cycle(pool.current_cycle),
        EqubChainError::AlreadyContributed
    );

    // Calculate contribution amount
    let contribution_amount = pool.contribution_amount;

    // Transfer tokens from member to escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.member_token_account.to_account_info(),
        to: ctx.accounts.escrow_vault.to_account_info(),
        authority: member.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );
    
    transfer(cpi_ctx, contribution_amount)?;

    // Update member contribution history
    member_account.add_contribution(pool.current_cycle)?;
    member_account.contribution_amount = contribution_amount;

    // Emit event
    emit_cpi!(ContributionMade {
        pool: pool.key(),
        member: member_account.key(),
        wallet: member.key(),
        amount: contribution_amount,
        cycle: pool.current_cycle,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
