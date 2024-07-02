use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program::{Transfer, transfer};

use crate::state::{LotteryPool, UserLottery};
use crate::error::JoGoLotteryErrorCode;

const ENTRY_LOTTERY_FEE: u64 = 10_000_000;
const BONUS_LOTTERY_PRIZE: u64 = 500_000_000_000;

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
        space = 8 + std::mem::size_of::< UserLottery > (),
        seeds = [
        b"user_lottery".as_ref(),
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
pub struct DrawLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
    #[account(mut, has_one = admin, constraint = ! lottery_pool.is_drawn @ JoGoLotteryErrorCode::AlreadyDrawnPool)]
    lottery_pool: Account<'info, LotteryPool>,
    system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimPrize<'info> {
    #[account(mut, has_one = owner)]
    pub user_lottery: Account<'info, UserLottery>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, constraint = lottery_pool.is_drawn @ JoGoLotteryErrorCode::PoolNotClosed)]
    pub lottery_pool: Account<'info, LotteryPool>,
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
}


pub(crate) fn _enter_lottery_pool(
    ctx: Context<EnterLotteryPool>,
    vote_number: u64,
) -> Result<()> {
    let clock: Clock = Clock::get().unwrap();
    let timestamp: u64 = clock.unix_timestamp.try_into().map_err(|_| error!(JoGoLotteryErrorCode::InvalidTimestamp))?;
    let user_lottery = &mut ctx.accounts.user_lottery;
    let lottery_pool = &mut ctx.accounts.lottery_pool;
    require!(vote_number > 0 && vote_number <= lottery_pool.maximum_number, JoGoLotteryErrorCode::InvalidVoteNumber);
    require!(timestamp < lottery_pool.deadline, JoGoLotteryErrorCode::LotteryPoolEnded);

    if user_lottery.owner == Pubkey::default() {
        user_lottery.owner = ctx.accounts.user.key();
        user_lottery.bump = ctx.bumps.user_lottery;
        user_lottery.vote_number = vote_number;
        user_lottery.lottery_pool = lottery_pool.key();
        user_lottery.is_claimed = false;
    } else {
        // check if the user has already entered the lottery pool
        require!(user_lottery.vote_number == vote_number, JoGoLotteryErrorCode::InvalidVoteNumber);
        require!(user_lottery.lottery_pool == lottery_pool.key(), JoGoLotteryErrorCode::InvalidPoolId);
    }

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.vault_account.to_account_info(),
        },
    );
    // transfer entry lottery fee
    transfer(cpi_ctx, ENTRY_LOTTERY_FEE)?;

    user_lottery.balance += ENTRY_LOTTERY_FEE;
    lottery_pool.prize += ENTRY_LOTTERY_FEE;
    emit!(EnterLotteryPoolEvent {
        pool_id: lottery_pool.pool_id,
        lottery_pool: lottery_pool.key(),
        user: ctx.accounts.user.key(),
        vote_number,
    });
    Ok(())
}


#[event]
pub struct DrawLotteryPoolEvent {
    #[index]
    pub pool_id: [u8; 32],
    #[index]
    pub lottery_pool: Pubkey,
    #[index]
    pub winning_number: u64,
}

pub(crate) fn _draw_lottery_pool(ctx: Context<DrawLotteryPool>, winning_number: u64) -> Result<()> {
    let lottery_pool = &mut ctx.accounts.lottery_pool;
    require!(lottery_pool.maximum_number >= winning_number && 0 < winning_number, JoGoLotteryErrorCode::InvalidWinningNumber);
    lottery_pool.is_drawn = true;
    lottery_pool.winning_number = winning_number;
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.admin.to_account_info(),
            to: ctx.accounts.vault_account.to_account_info(),
        },
    );
    // transfer bonus lottery prize
    transfer(cpi_ctx, BONUS_LOTTERY_PRIZE)?;

    lottery_pool.bonus_prize += BONUS_LOTTERY_PRIZE;
    emit!(DrawLotteryPoolEvent {
        pool_id: lottery_pool.pool_id,
        lottery_pool: lottery_pool.key(),
        winning_number,
    });
    Ok(())
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

pub(crate) fn _claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
    let user_lottery = &mut ctx.accounts.user_lottery;
    let lottery_pool = &mut ctx.accounts.lottery_pool;
    require!(user_lottery.lottery_pool.key() == lottery_pool.key(), JoGoLotteryErrorCode::InvalidPoolId);
    require!(user_lottery.vote_number == lottery_pool.winning_number, JoGoLotteryErrorCode::InvalidWinningNumber);
    require!(!user_lottery.is_claimed, JoGoLotteryErrorCode::AlreadyClaimed);
    user_lottery.is_claimed = true;

    let prize = (lottery_pool.bonus_prize + lottery_pool.prize) * user_lottery.balance / lottery_pool.prize;
    require!(prize > 0, JoGoLotteryErrorCode::NoPrize);
    require!(prize + lottery_pool.claimed_prize <= lottery_pool.bonus_prize + lottery_pool.prize, JoGoLotteryErrorCode::InsufficientPrize);

    lottery_pool.claimed_prize += prize;

    let admin_key = lottery_pool.admin.key();
    let lottery_pool_key = lottery_pool.key();
    let seeds = &[b"lottery_pool_sol", admin_key.as_ref(), lottery_pool_key.as_ref(), &[lottery_pool.vault_bump]];
    let signed_seeds = [&seeds[..]];
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        },
        &signed_seeds
    );
    transfer(cpi_ctx, prize)?;
    emit!(ClaimPrizeEvent {
        pool_id: lottery_pool.pool_id,
        lottery_pool: lottery_pool.key(),
        user: ctx.accounts.owner.key(),
        prize
    });
    Ok(())
}