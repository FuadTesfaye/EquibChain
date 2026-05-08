use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

use crate::{
    errors::EqubChainError,
    events::DisbursementExecuted,
    state::{Member, Pool, PoolState, ESCROW_SEED, MEMBER_SEED, POOL_SEED},
};

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct Disburse<'info> {
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
        init_if_needed,
        payer = authority,
        associated_token::mint = usdc_mint,
        associated_token::authority = recipient
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: This is the recipient wallet, validated through member account
    pub recipient: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [MEMBER_SEED.as_bytes(), pool.key().as_ref(), recipient.key().as_ref()],
        bump = member_account.bump
    )]
    pub member_account: Account<'info, Member>,
    
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

pub fn handler(ctx: Context<Disburse>, pool_id: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let member_account = &mut ctx.accounts.member_account;
    let escrow_vault = &mut ctx.accounts.escrow_vault;
    let clock = Clock::get()?;

    // Validate pool state
    require!(
        pool.pool_state == PoolState::Active,
        EqubChainError::InvalidPoolState
    );

    // Check if cycle is complete
    require!(
        pool.is_cycle_complete(),
        EqubChainError::CycleNotComplete
    );

    // Verify member is the intended recipient
    require!(
        member_account.wallet == ctx.accounts.recipient.key(),
        EqubChainError::Unauthorized
    );

    // Check if member has already received payout for this cycle
    require!(
        member_account.payout_received < pool.current_cycle,
        EqubChainError::AlreadyReceivedPayout
    );

    // Calculate disbursement amount (all contributions for this cycle)
    let disbursement_amount = pool.contribution_amount * pool.member_count as u64;

    // Check if escrow has sufficient balance
    require!(
        escrow_vault.amount >= disbursement_amount,
        EqubChainError::InsufficientEscrowBalance
    );

    // Transfer tokens from escrow to recipient
    let pool_key = pool.key();
    let seeds = &[
        ESCROW_SEED.as_bytes(),
        &pool_id.to_le_bytes(),
        &[pool.bump],
    ];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: escrow_vault.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: pool.to_account_info(),
    };
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer,
    );
    
    transfer(cpi_ctx, disbursement_amount)?;

    // Update member payout record
    member_account.payout_received = pool.current_cycle;

    // Move to next cycle
    pool.current_cycle += 1;
    pool.last_cycle_at = clock.unix_timestamp;

    // Check if pool should be completed (all members have received payouts)
    if pool.current_cycle > pool.member_count as u64 {
        pool.pool_state = PoolState::Completed;
        
        // Emit pool completion event
        use crate::events::PoolCompleted;
        emit_cpi!(PoolCompleted {
            pool: pool.key(),
            final_cycle: pool.current_cycle - 1,
            total_distributed: disbursement_amount * pool.member_count as u64,
            member_count: pool.member_count,
            timestamp: clock.unix_timestamp,
        });
    }

    // Emit disbursement event
    emit_cpi!(DisbursementExecuted {
        pool: pool.key(),
        recipient: member_account.wallet,
        amount: disbursement_amount,
        cycle: pool.current_cycle - 1,
        member_count: pool.member_count,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
