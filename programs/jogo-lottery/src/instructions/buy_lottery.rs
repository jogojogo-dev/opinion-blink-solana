use anchor_lang::prelude::*;
use anchor_lang::{event, Accounts};
use anchor_spl::token::{Mint, Token, TokenAccount};
use std::str::FromStr;

use crate::error::JoGoLotteryErrorCode;
use crate::instructions::utils::{transfer_sol, transfer_spl, wrap_sol};
use crate::state::{LotteryPool, UserLottery};
use crate::{generate_seeds, LOTTERY_POOL, USER_LOTTERY, WRAPPED_SOL};

#[derive(Accounts)]
#[instruction(vote_number: u64)]
pub struct EnterLotteryPool<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, constraint = ! lottery_pool.is_drawn @ JoGoLotteryErrorCode::AlreadyDrawnPool)]
    pub lottery_pool: Account<'info, LotteryPool>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = user,
        space = UserLottery::SIZE,
        seeds = [
            USER_LOTTERY,
            lottery_pool.key().as_ref(),
            user.key().as_ref(),
            & [vote_number as u8],
        ],
        bump
    )]
    pub user_lottery: Account<'info, UserLottery>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}

#[event]
pub struct EnterLotteryPoolEvent {
    #[index]
    pub pool_id: [u8; 32],
    #[index]
    pub lottery_pool: Pubkey,
    #[index]
    pub user: Pubkey,
    pub vote_number: u64,
    pub total_cost: u64,
}

pub struct EnterLotteryPoolEntry {}

impl EnterLotteryPoolEntry {
    pub(crate) fn enter_lottery_pool(
        ctx: Context<EnterLotteryPool>,
        vote_number: u64,
        buy_lottery_numbers: u64,
        use_sol: bool,
    ) -> Result<()> {
        let lottery_pool_account_info = ctx.accounts.lottery_pool.to_account_info();
        let user_lottery = &mut ctx.accounts.user_lottery;
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        require!(
            vote_number > 0 && vote_number <= lottery_pool.maximum_number,
            JoGoLotteryErrorCode::InvalidVoteNumber
        );
        require!(
            buy_lottery_numbers > 0,
            JoGoLotteryErrorCode::InvalidBuyLotteryNumbers
        );

        if user_lottery.owner == Pubkey::default() {
            user_lottery.owner = ctx.accounts.user.key();
            user_lottery.bump = user_lottery.bump;
            user_lottery.vote_number = vote_number;
            user_lottery.lottery_pool = lottery_pool.key();
            user_lottery.is_claimed = false;
            user_lottery.claimed_prize = 0;
            lottery_pool.votes_count[vote_number as usize] += 1;
        } else {
            // check if the user has already entered the lottery pool
            require!(
                user_lottery.vote_number == vote_number,
                JoGoLotteryErrorCode::InvalidVoteNumber
            );
            require!(
                user_lottery.lottery_pool == lottery_pool.key(),
                JoGoLotteryErrorCode::InvalidPoolId
            );
        }

        let total_cost = lottery_pool.entry_lottery_price * buy_lottery_numbers;

        if use_sol {
            require!(
                ctx.accounts.vault_token_account.mint == Pubkey::from_str(WRAPPED_SOL).unwrap(),
                JoGoLotteryErrorCode::InvalidMintAccount
            );
            require!(
                ctx.accounts.vault_token_account.mint == ctx.accounts.user_token_account.mint,
                JoGoLotteryErrorCode::InvalidMintAccount
            );
            // wrap sol to wrapped sol and transfer to vault_token_account
            transfer_sol(
                ctx.accounts.user.to_account_info(),
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                total_cost,
                true,
                &[],
            )?;
            let admin_key = lottery_pool.admin.key();
            let seeds = generate_seeds!(lottery_pool, admin_key);
            wrap_sol(
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                seeds,
            )?;
        } else {
            // transfer spl token to vault_token_account
            transfer_spl(
                ctx.accounts.user_token_account.to_account_info(),
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                lottery_pool_account_info,
                total_cost,
                true,
                &[],
            )?;
        }

        lottery_pool.prize += total_cost;
        lottery_pool.votes_prize[vote_number as usize] += total_cost;
        user_lottery.balance += total_cost;

        emit!(EnterLotteryPoolEvent {
            pool_id: lottery_pool.pool_id,
            lottery_pool: lottery_pool.key(),
            user: ctx.accounts.user.key(),
            vote_number,
            total_cost,
        });
        Ok(())
    }
}
