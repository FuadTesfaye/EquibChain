use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{transfer, Mint, Token, TokenAccount, Transfer},
};

mod errors;
mod events;
mod instructions;
mod state;

use errors::*;
use events::*;
use instructions::*;
use state::*;

declare_id!("EqubChain11111111111111111111111111111111111");

#[program]
pub mod equbchain {
    use super::*;

    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        pool_id: u64,
        contribution_amount: u64,
        cycle_duration: u64,
        max_members: u32,
    ) -> Result<()> {
        instructions::initialize_pool::handler(ctx, pool_id, contribution_amount, cycle_duration, max_members)
    }

    pub fn join_pool(ctx: Context<JoinPool>, pool_id: u64) -> Result<()> {
        instructions::join_pool::handler(ctx, pool_id)
    }

    pub fn contribute(ctx: Context<Contribute>, pool_id: u64) -> Result<()> {
        instructions::contribute::handler(ctx, pool_id)
    }

    pub fn disburse(ctx: Context<Disburse>, pool_id: u64) -> Result<()> {
        instructions::disburse::handler(ctx, pool_id)
    }

    pub fn update_member_score(
        ctx: Context<UpdateMemberScore>,
        pool_id: u64,
        member: Pubkey,
        new_score: u8,
    ) -> Result<()> {
        instructions::update_member_score::handler(ctx, pool_id, member, new_score)
    }

    pub fn set_scoring_authority(
        ctx: Context<SetScoringAuthority>,
        pool_id: u64,
        new_authority: Pubkey,
    ) -> Result<()> {
        instructions::set_scoring_authority::handler(ctx, pool_id, new_authority)
    }

    pub fn slash_defaulter(
        ctx: Context<SlashDefaulter>,
        pool_id: u64,
        member: Pubkey,
    ) -> Result<()> {
        instructions::slash_defaulter::handler(ctx, pool_id, member)
    }

    pub fn pause_pool(ctx: Context<PausePool>, pool_id: u64) -> Result<()> {
        instructions::pause_pool::handler(ctx, pool_id)
    }

    pub fn resume_pool(ctx: Context<ResumePool>, pool_id: u64) -> Result<()> {
        instructions::resume_pool::handler(ctx, pool_id)
    }

    pub fn emergency_close(ctx: Context<EmergencyClose>, pool_id: u64) -> Result<()> {
        instructions::emergency_close::handler(ctx, pool_id)
    }
}
