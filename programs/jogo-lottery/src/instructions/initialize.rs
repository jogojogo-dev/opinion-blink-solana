use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

use crate::state::{LotteryPool};
use crate::error::JoGoLotteryErrorCode;

#[derive(Accounts)]
#[instruction(pool_id: [u8; 32])]
pub struct InitLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + std::mem::size_of::< LotteryPool>(),
        seeds = [
            b"lottery_pool".as_ref(),
            admin.key.as_ref(),
            pool_id.as_ref()
        ],
        bump
    )]
    pub lottery_pool: Account<'info, LotteryPool>,
    #[account(
        mut,
        seeds = [b"lottery_pool_sol", admin.key().as_ref(), lottery_pool.key().as_ref()],
        bump
    )]
    pub vault_account: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}


#[event]
pub struct InitLotteryPoolEvent {
    pub admin: Pubkey,
    pub lottery_pool: Pubkey,
    pub maximum_number: u64,
    pub deadline: u64
}

pub(crate) fn _init_lottery_pool(
    ctx: Context<InitLotteryPool>,
    pool_id: [u8; 32],
    maximum_number: u64,
    deadline: u64
) -> Result<()> {
    let lottery_pool = &mut ctx.accounts.lottery_pool;
    require!(lottery_pool.is_initialized != true, JoGoLotteryErrorCode::LotteryPoolAlreadyInitialized);
    let clock = Clock::get().unwrap();
    let timestamp: u64 = clock.unix_timestamp.try_into().map_err(|_| error!(JoGoLotteryErrorCode::InvalidTimestamp))?;
    require!(timestamp <= deadline, JoGoLotteryErrorCode::InvalidDeadline);
    lottery_pool.is_initialized = true;
    lottery_pool.bump = ctx.bumps.lottery_pool;
    lottery_pool.vault_bump = ctx.bumps.vault_account;
    lottery_pool.admin = ctx.accounts.admin.key();
    lottery_pool.pool_id = pool_id;
    lottery_pool.winning_number = 0; // initialize to 0
    lottery_pool.maximum_number = maximum_number;
    lottery_pool.is_drawn = false;
    lottery_pool.prize = 0;
    lottery_pool.bonus_prize = 0;
    lottery_pool.claimed_prize = 0;
    lottery_pool.deadline = deadline;
    emit!(InitLotteryPoolEvent {
        admin: lottery_pool.admin,
        lottery_pool: lottery_pool.key(),
        maximum_number,
        deadline
    });
    Ok(())
}