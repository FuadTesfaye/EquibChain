use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    errors::EqubChainError,
    events::MemberSlashed,
    state::{Member, Pool, PoolState, ESCROW_SEED, MEMBER_SEED, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64, member: Pubkey)]
pub struct SlashDefaulter<'info> {
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
    
    #[account(
        mut,
        seeds = [MEMBER_SEED.as_bytes(), pool.key().as_ref(), member.as_ref()],
        bump = member_account.bump
    )]
    pub member_account: Account<'info, Member>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = usdc_mint,
        associated_token::authority = authority
    )]
    pub authority_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
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
    ctx: Context<SlashDefaulter>,
    pool_id: u64,
    member: Pubkey,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let member_account = &mut ctx.accounts.member_account;
    let escrow_vault = &mut ctx.accounts.escrow_vault;
    let authority = &ctx.accounts.authority;
    let clock = Clock::get()?;

    // Validate pool state
    require!(
        pool.pool_state == PoolState::Active,
        EqubChainError::InvalidPoolState
    );

    // Verify member wallet matches
    require!(
        member_account.wallet == member,
        EqubChainError::MemberNotFound
    );

    // Check if member has missed contributions
    let current_cycle = pool.current_cycle;
    let has_contributed_current_cycle = member_account.has_contributed_this_cycle(current_cycle);
    
    // Only slash if member has missed current contribution and is active
    require!(
        !has_contributed_current_cycle && member_account.active_status,
        EqubChainError::CannotSlashMember
    );

    // Calculate slash amount (50% of contribution amount as penalty)
    let slash_amount = pool.contribution_amount / 2;
    
    // Check if escrow has sufficient balance
    require!(
        escrow_vault.amount >= slash_amount,
        EqubChainError::InsufficientEscrowBalance
    );

    // Deactivate member
    member_account.active_status = false;
    member_account.missed_cycles += 1;

    // Transfer slash amount from escrow to authority
    let pool_key = pool.key();
    let seeds = &[
        ESCROW_SEED.as_bytes(),
        &pool_id.to_le_bytes(),
        &[pool.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: escrow_vault.to_account_info(),
        to: ctx.accounts.authority_token_account.to_account_info(),
        authority: pool.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    
    transfer(cpi_ctx, slash_amount)?;

    // Update pool member count
    pool.member_count = pool.member_count.saturating_sub(1);

    // Emit event
    emit_cpi!(MemberSlashed {
        pool: pool.key(),
        member: member_account.key(),
        wallet: member,
        slash_amount,
        reason: "Missed contribution cycle".to_string(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
