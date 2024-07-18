use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{Mint, Token, TokenAccount, sync_native};

use crate::error::JoGoLotteryErrorCode;
use crate::state::{LotteryPool, UserLottery};
use crate::{LOTTERY_POOL_SOL, USER_LOTTERY};

#[derive(Accounts)]
pub struct CloseLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        mut, has_one = admin, constraint = lottery_pool.is_drawn @ JoGoLotteryErrorCode::PoolNotClosed
    )]
    pub lottery_pool: Account<'info, LotteryPool>,
    #[account(mut)]
    /// CHECK: This is only used to store the prize, safe to use unchecked_account
    pub vault_account: UncheckedAccount<'info>,
    token_program: Program<'info, Token>,
    system_program: Program<'info, System>,
}


pub(crate) fn _claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
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

    let prize = lottery_pool.calculate_prize(user_lottery.balance);
    require!(prize > 0, JoGoLotteryErrorCode::NoPrize);
    require!(
        prize + lottery_pool.claimed_prize <= lottery_pool.bonus_prize + lottery_pool.prize,
        JoGoLotteryErrorCode::InsufficientPrize
    );

    lottery_pool.claimed_prize += prize;
    lottery_pool.claimed_count += 1;
    user_lottery.claimed_prize = prize; // store the claimed prize with fee

    // let admin_key = lottery_pool.admin.key();
    // let lottery_pool_key = lottery_pool.key();
    // let seeds = &[
    //     LOTTERY_POOL_SOL,
    //     admin_key.as_ref(),
    //     lottery_pool_key.as_ref(),
    //     &[lottery_pool.vault_bump],
    // ];
    // let signed_seeds = [&seeds[..]];
    // let cpi_ctx = CpiContext::new_with_signer(
    //     ctx.accounts.system_program.to_account_info(),
    //     Transfer {
    //         from: ctx.accounts.vault_account.to_account_info(),
    //         to: ctx.accounts.owner.to_account_info(),
    //     },
    //     &signed_seeds,
    // );
    //
    // let actual_prize = prize - lottery_pool.lottery_fee * prize / 1000;
    // transfer(cpi_ctx, actual_prize)?;
    emit!(ClaimPrizeEvent {
        pool_id: lottery_pool.pool_id,
        lottery_pool: lottery_pool.key(),
        user: ctx.accounts.owner.key(),
        prize
    });
    Ok(())
}

pub(crate) fn _close_lottery_pool(ctx: Context<CloseLotteryPool>) -> Result<()> {
    let lottery_pool = &mut ctx.accounts.lottery_pool;
    require!(lottery_pool.is_drawn, JoGoLotteryErrorCode::PoolNotClosed);

    let remaining = ctx.accounts.vault_account.lamports();
    if remaining > 0 {
        let admin_key = lottery_pool.admin.key();
        let lottery_pool_key = lottery_pool.key();
        let seeds = &[
            LOTTERY_POOL_SOL,
            admin_key.as_ref(),
            lottery_pool_key.as_ref(),
            &[lottery_pool.vault_bump],
        ];
        let signed_seeds = [&seeds[..]];
        // let cpi_ctx = CpiContext::new_with_signer(
        //     ctx.accounts.system_program.to_account_info(),
        //     Transfer {
        //         from: ctx.accounts.vault_account.to_account_info(),
        //         to: ctx.accounts.admin.to_account_info(),
        //     },
        //     &signed_seeds,
        // );
        // transfer(cpi_ctx, remaining)?;
    }
    Ok(())
}
