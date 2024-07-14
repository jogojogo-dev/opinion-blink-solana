use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program::{transfer, Transfer};

use crate::error::JoGoLotteryErrorCode;
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
pub struct DrawLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
    #[account(mut)]
    /// CHECK: This is only used to receive the prize, safe to use unchecked_account
    pub recipient: UncheckedAccount<'info>,
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

#[derive(Accounts)]
pub struct CloseLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, has_one = admin, constraint = lottery_pool.is_drawn @ JoGoLotteryErrorCode::PoolNotClosed)]
    pub lottery_pool: Account<'info, LotteryPool>,
    #[account(mut)]
    pub vault_account: SystemAccount<'info>,
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

pub(crate) fn _enter_lottery_pool(
    ctx: Context<EnterLotteryPool>,
    vote_number: u64,
    buy_lottery_numbers: u64,
) -> Result<()> {
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
        user_lottery.bump = ctx.bumps.user_lottery;
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

    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.user.to_account_info(),
            to: ctx.accounts.vault_account.to_account_info(),
        },
    );

    let total_cost = lottery_pool.entry_lottery_price * buy_lottery_numbers;
    transfer(cpi_ctx, total_cost)?;
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

#[event]
pub struct DrawLotteryPoolEvent {
    #[index]
    pub pool_id: [u8; 32],
    #[index]
    pub lottery_pool: Pubkey,
    #[index]
    pub winning_number: u64,
    pub recipient: Pubkey
}

pub(crate) fn _draw_lottery_pool(
    ctx: Context<DrawLotteryPool>,
    winning_number: u64,
    bonus_lottery_prize: u64,
) -> Result<()> {
    let lottery_pool = &mut ctx.accounts.lottery_pool;
    require!(
        lottery_pool.maximum_number >= winning_number && 0 < winning_number,
        JoGoLotteryErrorCode::InvalidWinningNumber
    );
    lottery_pool.is_drawn = true;
    lottery_pool.winning_number = winning_number;
    let cpi_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.admin.to_account_info(),
            to: ctx.accounts.vault_account.to_account_info(),
        },
    );

    transfer(cpi_ctx, bonus_lottery_prize)?;
    lottery_pool.bonus_prize += bonus_lottery_prize;

    let admin_key = lottery_pool.admin.key();
    let lottery_pool_key = lottery_pool.key();
    let seeds = &[
        LOTTERY_POOL_SOL,
        admin_key.as_ref(),
        lottery_pool_key.as_ref(),
        &[lottery_pool.vault_bump],
    ];
    let signed_seeds = [&seeds[..]];
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
        },
        &signed_seeds,
    );
    let fee = lottery_pool.lottery_fee * (lottery_pool.prize + lottery_pool.bonus_prize) / 1000;
    transfer(cpi_ctx, fee)?;

    emit!(DrawLotteryPoolEvent {
        pool_id: lottery_pool.pool_id,
        lottery_pool: lottery_pool.key(),
        winning_number,
        recipient: ctx.accounts.recipient.key()
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

    let admin_key = lottery_pool.admin.key();
    let lottery_pool_key = lottery_pool.key();
    let seeds = &[
        LOTTERY_POOL_SOL,
        admin_key.as_ref(),
        lottery_pool_key.as_ref(),
        &[lottery_pool.vault_bump],
    ];
    let signed_seeds = [&seeds[..]];
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.owner.to_account_info(),
        },
        &signed_seeds,
    );

    let actual_prize = prize - lottery_pool.lottery_fee * prize / 1000;
    transfer(cpi_ctx, actual_prize)?;
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
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_account.to_account_info(),
                to: ctx.accounts.admin.to_account_info(),
            },
            &signed_seeds,
        );
        transfer(cpi_ctx, remaining)?;
    }
    Ok(())
}
