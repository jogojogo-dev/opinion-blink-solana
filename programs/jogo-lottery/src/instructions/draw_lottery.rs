use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use std::str::FromStr;

use crate::error::JoGoLotteryErrorCode;
use crate::instructions::utils::{transfer_sol, transfer_spl};
use crate::state::LotteryPool;
use crate::{generate_seeds, LOTTERY_POOL, WRAPPED_SOL};

#[derive(Accounts)]
pub struct DrawLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub admin_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
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
    fn calculate_prize_fee(lottery_pool: &Account<LotteryPool>) -> u64 {
        lottery_pool.lottery_fee * (lottery_pool.prize + lottery_pool.bonus_prize) / 1000
    }

    pub(crate) fn draw_lottery_sol_pool(
        ctx: Context<DrawLotteryPool>,
        winning_number: u64,
        bonus_lottery_prize: u64,
        use_sol: bool,
    ) -> Result<()> {
        let lottery_pool_account_info = ctx.accounts.lottery_pool.to_account_info();
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        require!(
            lottery_pool.maximum_number >= winning_number && 0 < winning_number,
            JoGoLotteryErrorCode::InvalidWinningNumber
        );
        lottery_pool.is_drawn = true;
        lottery_pool.winning_number = winning_number;
        lottery_pool.bonus_prize += bonus_lottery_prize;

        // Admin transfer bonus prize to vault
        if bonus_lottery_prize > 0 {
            if use_sol {
                require!(
                    ctx.accounts.vault_token_account.mint == Pubkey::from_str(WRAPPED_SOL).unwrap(),
                    JoGoLotteryErrorCode::InvalidMintAccount
                );
                require!(
                    ctx.accounts.vault_token_account.mint == ctx.accounts.admin_token_account.mint,
                    JoGoLotteryErrorCode::InvalidMintAccount
                );
                // wrap sol to wrapped sol and transfer to vault_token_account
                transfer_sol(
                    ctx.accounts.admin.to_account_info(),
                    ctx.accounts.vault_token_account.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    bonus_lottery_prize,
                    true,
                    &[],
                )?;
            } else {
                transfer_spl(
                    ctx.accounts.admin_token_account.to_account_info(),
                    ctx.accounts.vault_token_account.to_account_info(),
                    ctx.accounts.admin.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    bonus_lottery_prize,
                    true,
                    &[],
                )?;
            }
        }

        // Vault transfer fee to recipient as wrapped sol
        let fee = Self::calculate_prize_fee(lottery_pool);
        if fee > 0 {
            let admin_key = lottery_pool.admin.key();
            let seeds = generate_seeds!(lottery_pool, admin_key);
            transfer_spl(
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.recipient.to_account_info(),
                lottery_pool_account_info,
                ctx.accounts.token_program.to_account_info(),
                fee,
                false,
                seeds,
            )?;
        }

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
