use anchor_lang::prelude::*;
use anchor_lang::Accounts;
use anchor_spl::token::{Token, TokenAccount};

use crate::error::JoGoLotteryErrorCode;
use crate::instructions::utils::{transfer_sol, transfer_spl};
use crate::state::LotteryPool;
use crate::{LOTTERY_POOL, LOTTERY_POOL_SOL};

#[derive(Accounts)]
pub struct DrawLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
    #[account(mut)]
    /// CHECK: This is only used to receive the prize, safe to use unchecked_account
    pub recipient: UncheckedAccount<'info>,
    #[account(
        mut, has_one = admin, constraint = ! lottery_pool.is_drawn @ JoGoLotteryErrorCode::AlreadyDrawnPool
    )]
    lottery_pool: Account<'info, LotteryPool>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(key: Pubkey)]
pub struct DrawLotterySPLPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut, constraint = admin_token_account.mint == key @ JoGoLotteryErrorCode::InvalidMint
    )]
    pub admin_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, constraint = vault_token_account.mint == key @ JoGoLotteryErrorCode::InvalidMint
    )]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        mut, constraint = recipient.mint == key @ JoGoLotteryErrorCode::InvalidMint
    )]
    pub recipient: Account<'info, TokenAccount>,
    #[account(
        mut, has_one = admin, constraint = ! lottery_pool.is_drawn @ JoGoLotteryErrorCode::AlreadyDrawnPool
    )]
    lottery_pool: Account<'info, LotteryPool>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

#[event]
pub struct DrawLotteryPoolEvent {
    #[index]
    pub pool_id: [u8; 32],
    #[index]
    pub lottery_pool: Pubkey,
    #[index]
    pub winning_number: u64,
    pub recipient: Pubkey,
    pub fee: u64,
}

pub struct DrawLotteryPoolEntry {}

impl DrawLotteryPoolEntry {
    fn draw_lottery_pool(
        lottery_pool: &mut Account<LotteryPool>,
        winning_number: u64,
    ) -> Result<()> {
        require!(
            lottery_pool.maximum_number >= winning_number && 0 < winning_number,
            JoGoLotteryErrorCode::InvalidWinningNumber
        );
        lottery_pool.is_drawn = true;
        lottery_pool.winning_number = winning_number;
        Ok(())
    }

    fn calculate_prize_fee(lottery_pool: &Account<LotteryPool>) -> u64 {
        lottery_pool.lottery_fee * (lottery_pool.prize + lottery_pool.bonus_prize) / 1000
    }

    pub(crate) fn draw_lottery_sol_pool(
        ctx: Context<DrawLotteryPool>,
        winning_number: u64,
        bonus_lottery_prize: u64,
    ) -> Result<()> {
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        Self::draw_lottery_pool(lottery_pool, winning_number)?;

        // Admin transfer bonus prize to vault
        transfer_sol(
            &ctx.accounts.admin.to_account_info(),
            &ctx.accounts.vault_account.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            bonus_lottery_prize,
            true,
            &[],
        );
        lottery_pool.bonus_prize += bonus_lottery_prize;

        // Vault transfer fee to recipient
        let fee = Self::calculate_prize_fee(lottery_pool);
        let admin_key = lottery_pool.admin.key();
        let lottery_pool_key = lottery_pool.key();
        let seeds = &[
            LOTTERY_POOL_SOL,
            admin_key.as_ref(),
            lottery_pool_key.as_ref(),
            &[lottery_pool.vault_bump],
        ];
        transfer_sol(
            &ctx.accounts.vault_account.to_account_info(),
            &ctx.accounts.recipient.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            fee,
            false,
            seeds,
        );

        emit!(DrawLotteryPoolEvent {
            pool_id: lottery_pool.pool_id,
            lottery_pool: lottery_pool.key(),
            winning_number,
            recipient: ctx.accounts.recipient.key(),
            fee
        });
        Ok(())
    }

    pub(crate) fn draw_lottery_spl_pool(
        ctx: Context<DrawLotterySPLPool>,
        key: Pubkey,
        winning_number: u64,
        bonus_lottery_prize: u64,
    ) -> Result<()> {
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        Self::draw_lottery_pool(lottery_pool, winning_number)?;

        // Admin transfer bonus prize to vault
        transfer_spl(
            &ctx.accounts.admin_token_account.to_account_info(),
            &ctx.accounts.vault_token_account.to_account_info(),
            &ctx.accounts.admin.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            bonus_lottery_prize,
            true,
            &[],
        );
        lottery_pool.bonus_prize += bonus_lottery_prize;

        // Vault transfer fee to recipient
        let fee = Self::calculate_prize_fee(lottery_pool);
        let admin_key = lottery_pool.admin.key();
        let pool_id = lottery_pool.pool_id;
        let seeds = &[
            LOTTERY_POOL,
            admin_key.as_ref(),
            pool_id.as_ref(),
            key.as_ref(),
            &[lottery_pool.bump],
        ];
        transfer_spl(
            &ctx.accounts.vault_token_account.to_account_info(),
            &ctx.accounts.recipient.to_account_info(),
            &ctx.accounts.lottery_pool.to_account_info(),
            &ctx.accounts.token_program.to_account_info(),
            fee,
            false,
            seeds,
        );

        emit!(DrawLotteryPoolEvent {
            pool_id: lottery_pool.pool_id,
            lottery_pool: lottery_pool.key(),
            winning_number,
            recipient: ctx.accounts.recipient.key(),
            fee
        });
        Ok(())
    }
}
