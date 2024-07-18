use std::str::FromStr;

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::{generate_seeds, LOTTERY_POOL, WRAPPED_SOL};
use crate::error::JoGoLotteryErrorCode;
use crate::instructions::utils::{transfer_sol, transfer_spl};
use crate::state::LotteryPool;

#[derive(Accounts)]
pub struct CloseLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub admin_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(
        mut, has_one = admin, constraint = lottery_pool.is_drawn @ JoGoLotteryErrorCode::PoolNotClosed
    )]
    pub lottery_pool: Account<'info, LotteryPool>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

#[event]
pub struct CloseLotteryPoolEvent {
    #[index]
    pub pool_id: [u8; 32],
    #[index]
    pub lottery_pool: Pubkey,
}

pub struct CloseLotteryPoolEntry {}

impl CloseLotteryPoolEntry {
    pub(crate) fn close_lottery_pool(ctx: Context<CloseLotteryPool>) -> anchor_lang::Result<()> {
        let lottery_pool_account_info = ctx.accounts.lottery_pool.to_account_info();
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        require!(lottery_pool.is_drawn, JoGoLotteryErrorCode::PoolNotClosed);
        let remaining_token_amount = ctx.accounts.vault_token_account.amount;
        if remaining_token_amount > 0 {
            let admin_key = lottery_pool.admin.key();
            let seeds = generate_seeds!(lottery_pool, admin_key);
            transfer_spl(
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.admin_token_account.to_account_info(),
                lottery_pool_account_info,
                ctx.accounts.token_program.to_account_info(),
                remaining_token_amount,
                false,
                seeds,
            )?;
        }
        Ok(())
    }
}
