use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    errors::EqubChainError,
    events::EmergencyClose,
    state::{Pool, PoolState, ESCROW_SEED, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct EmergencyClose<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        close = creator,
        seeds = [POOL_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump = pool.bump,
        has_one = creator
    )]
    pub pool: Account<'info, Pool>,
    
    /// CHECK: This is the creator account, validated through pool account
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = usdc_mint,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        seeds = [ESCROW_SEED.as_bytes(), &pool_id.to_le_bytes()],
        bump,
        close = authority
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    pub usdc_mint: Account<'info, Mint>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<EmergencyClose>, pool_id: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let escrow_vault = &mut ctx.accounts.escrow_vault;
    let authority = &ctx.accounts.authority;
    let creator = &ctx.accounts.creator;
    let clock = Clock::get()?;

    // Only allow emergency close for paused or completed pools
    require!(
        pool.pool_state == PoolState::Paused || pool.pool_state == PoolState::Completed,
        EqubChainError::PoolCannotClose
    );

    // Calculate remaining balance
    let remaining_balance = escrow_vault.amount;

    // Transfer remaining funds to creator
    if remaining_balance > 0 {
        let pool_key = pool.key();
        let seeds = &[
            ESCROW_SEED.as_bytes(),
            &pool_id.to_le_bytes(),
            &[pool.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: escrow_vault.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: pool.to_account_info(),
        };
        
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer,
        );
        
        transfer(cpi_ctx, remaining_balance)?;
    }

    // Mark pool as completed before closing
    pool.pool_state = PoolState::Completed;

    // Emit event
    emit_cpi!(EmergencyClose {
        pool: pool.key(),
        authority: authority.key(),
        reason: "Emergency closure by authority".to_string(),
        remaining_balance,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
