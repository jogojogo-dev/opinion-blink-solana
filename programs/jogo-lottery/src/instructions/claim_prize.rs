use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::error::JoGoLotteryErrorCode;
use crate::instructions::utils::transfer_spl;
use crate::state::{LotteryPool, UserLottery};
use crate::{generate_seeds, LOTTERY_POOL, USER_LOTTERY};

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    /// CHECK: This is only used to show admin pubkey, safe to use unchecked_account
    pub admin: UncheckedAccount<'info>,
    #[account(mut, has_one = owner)]
    pub user_lottery: Account<'info, UserLottery>,
    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut)]
    pub user_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, constraint = lottery_pool.is_drawn @ JoGoLotteryErrorCode::PoolNotClosed)]
    pub lottery_pool: Account<'info, LotteryPool>,
    system_program: Program<'info, System>,
    token_program: Program<'info, Token>,
}

#[event]
pub struct ClaimPrizeEvent {
    #[index]
    pub pool_id: [u8; 32],
    #[index]
    pub lottery_pool: Pubkey,
    #[index]
    pub user: Pubkey,
    pub prize: u64,
}

pub struct ClaimPrizeEntry {}

impl ClaimPrizeEntry {
    pub(crate) fn claim_prize(ctx: Context<ClaimPrize>, is_no_prize: bool) -> Result<()> {
        let lottery_pool_account_info = ctx.accounts.lottery_pool.to_account_info();
        let user_lottery = &mut ctx.accounts.user_lottery;
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        require!(
            user_lottery.lottery_pool.key() == lottery_pool.key(),
            JoGoLotteryErrorCode::InvalidPoolId
        );
        require!(
            user_lottery.vote_number == lottery_pool.winning_number,
            JoGoLotteryErrorCode::InvalidWinningNumber
        );
        require!(
            !user_lottery.is_claimed,
            JoGoLotteryErrorCode::AlreadyClaimed
        );
        user_lottery.is_claimed = true;
        lottery_pool.claimed_count += 1;

        let prize = 0;
        if !is_no_prize {
            let prize = lottery_pool.calculate_prize(user_lottery.balance);
            require!(prize > 0, JoGoLotteryErrorCode::NoPrize);
            require!(
                prize + lottery_pool.claimed_prize <= lottery_pool.bonus_prize + lottery_pool.prize,
                JoGoLotteryErrorCode::InsufficientPrize
            );
            let actual_prize = prize - lottery_pool.lottery_fee * prize / 1000;
            lottery_pool.claimed_prize += prize;
            user_lottery.claimed_prize = prize; // store the claimed prize with fee

            let admin_key = lottery_pool.admin.key();
            let seeds = generate_seeds!(lottery_pool, admin_key);
            transfer_spl(
                ctx.accounts.vault_token_account.to_account_info(),
                ctx.accounts.user_token_account.to_account_info(),
                lottery_pool_account_info,
                ctx.accounts.token_program.to_account_info(),
                actual_prize,
                false,
                seeds,
            )?;
        } else {
            require!(lottery_pool.votes_prize[lottery_pool.winning_number as usize] == 0, JoGoLotteryErrorCode::InvalidVotePrize);
        }

        emit!(ClaimPrizeEvent {
            pool_id: lottery_pool.pool_id,
            lottery_pool: lottery_pool.key(),
            user: ctx.accounts.owner.key(),
            prize
        });
        Ok(())
    }
}
