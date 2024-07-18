use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::JoGoLotteryErrorCode;
use crate::state::{LotteryPool, UserLottery};
use crate::{LOTTERY_POOL_SOL, USER_LOTTERY};

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
pub struct ClaimSPLPrize<'info> {
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
pub struct ClaimPrizeEvent {
    #[index]
    pub pool_id: [u8; 32],
    #[index]
    pub lottery_pool: Pubkey,
    #[index]
    pub user: Pubkey,
    pub prize: u64,
}
