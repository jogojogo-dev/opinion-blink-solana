use anchor_lang::prelude::*;
use anchor_lang::prelude::{Account, Program, Pubkey, Signer, System, SystemAccount};
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_lang::{event, Accounts};
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::JoGoLotteryErrorCode;
use crate::instructions::utils::{transfer_sol, transfer_spl};
use crate::state::{LotteryPool, UserLottery};
use crate::{LOTTERY_POOL_SOL, USER_LOTTERY};

#[derive(Accounts)]
#[instruction(vote_number: u64)]
pub struct EnterLotteryPool<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, constraint = ! lottery_pool.is_drawn @ JoGoLotteryErrorCode::AlreadyDrawnPool)]
    pub lottery_pool: Account<'info, LotteryPool>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
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
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(vote_number: u64)]
pub struct EnterLotterySPLPool<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, constraint = ! lottery_pool.is_drawn @ JoGoLotteryErrorCode::AlreadyDrawnPool)]
    pub lottery_pool: Account<'info, LotteryPool>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_token_account.mint == mint_account.key())]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub mint_account: Account<'info, Mint>,
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
    fn _entry_lottery_pool(
        lottery_pool: &mut Account<LotteryPool>,
        user_lottery: &mut Account<UserLottery>,
        user_key: Pubkey,
        user_lottery_bump: u8,
        vote_number: u64,
        buy_lottery_numbers: u64,
    ) -> Result<()> {
        require!(
            vote_number > 0 && vote_number <= lottery_pool.maximum_number,
            JoGoLotteryErrorCode::InvalidVoteNumber
        );
        require!(
            buy_lottery_numbers > 0,
            JoGoLotteryErrorCode::InvalidBuyLotteryNumbers
        );

        if user_lottery.owner == Pubkey::default() {
            user_lottery.owner = user_key;
            user_lottery.bump = user_lottery_bump;
            user_lottery.vote_number = vote_number;
            user_lottery.lottery_pool = lottery_pool.key();
            user_lottery.is_claimed = false;
            user_lottery.claimed_prize = 0;
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
        Ok(())
    }

    pub(crate) fn enter_lottery_sol_pool(
        ctx: Context<EnterLotteryPool>,
        vote_number: u64,
        buy_lottery_numbers: u64,
    ) -> Result<()> {
        let user_lottery = &mut ctx.accounts.user_lottery;
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        require!(
            lottery_pool.is_spl == false,
            JoGoLotteryErrorCode::MismatchLotteryPool
        );
        Self::_entry_lottery_pool(
            lottery_pool,
            user_lottery,
            ctx.accounts.user.key(),
            user_lottery.bump,
            vote_number,
            buy_lottery_numbers,
        )?;

        let total_cost = lottery_pool.entry_lottery_price * buy_lottery_numbers;

        // User transfer sol to vault_account
        transfer_sol(
            &ctx.accounts.user.to_account_info(),
            &ctx.accounts.vault_account.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            total_cost,
            true,
            &[],
        );

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

    pub(crate) fn enter_lottery_spl_pool(
        ctx: Context<EnterLotterySPLPool>,
        vote_number: u64,
        buy_lottery_numbers: u64,
    ) -> Result<()> {
        let user_lottery = &mut ctx.accounts.user_lottery;
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        require!(
            lottery_pool.is_spl == false,
            JoGoLotteryErrorCode::MismatchLotteryPool
        );
        Self::_entry_lottery_pool(
            lottery_pool,
            user_lottery,
            ctx.accounts.user.key(),
            user_lottery.bump,
            vote_number,
            buy_lottery_numbers,
        )?;

        let total_cost = lottery_pool.entry_lottery_price * buy_lottery_numbers;
        // User transfer spl to vault_account
        transfer_spl(
            &ctx.accounts.user_token_account.to_account_info(),
            &ctx.accounts.vault_token_account.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            &ctx.accounts.lottery_pool.to_account_info(),
            total_cost,
            true,
            &[],
        );
        Ok(())
    }
}
