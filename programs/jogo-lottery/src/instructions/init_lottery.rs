use anchor_lang::prelude::*;
use anchor_spl::associated_token::{get_associated_token_address, AssociatedToken};
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::error::JoGoLotteryErrorCode;
use crate::state::LotteryPool;
use crate::{LOTTERY_POOL, MAX_VOTE_NUMBERS};

#[derive(Accounts)]
#[instruction(pool_id: [u8; 32])]
pub struct InitLotteryPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init_if_needed,
        payer = admin,
        space = LotteryPool::SIZE,
        seeds = [
            LOTTERY_POOL,
            admin.key.as_ref(),
            pool_id.as_ref(),
        ],
        bump
    )]
    pub lottery_pool: Account<'info, LotteryPool>,
    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = mint_account,
        associated_token::authority = lottery_pool,
    )]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    pub mint_account: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

#[event]
pub struct InitLotteryPoolEvent {
    pub admin: Pubkey,
    pub lottery_pool: Pubkey,
    pub maximum_number: u64,
    pub entry_lottery_price: u64,
    pub lottery_fee: u64,
}

pub struct InitLotteryPoolEntry {}

impl InitLotteryPoolEntry {
    fn check_requirement(
        lottery_pool: &Account<LotteryPool>,
        maximum_number: u64,
        lottery_fee: u64,
    ) -> Result<()> {
        require!(
            lottery_pool.is_initialized != true,
            JoGoLotteryErrorCode::LotteryPoolAlreadyInitialized
        );
        require!(
            maximum_number <= MAX_VOTE_NUMBERS as u64,
            JoGoLotteryErrorCode::MaxVoteNumberExceed
        );
        require!(lottery_fee < 1000, JoGoLotteryErrorCode::InvalidLotteryFee);
        Ok(())
    }

    pub(crate) fn initialize_lottery_pool(
        ctx: Context<InitLotteryPool>,
        pool_id: [u8; 32],
        maximum_number: u64,
        entry_lottery_price: u64,
        lottery_fee: u64,
    ) -> Result<()> {
        let lottery_pool = &mut ctx.accounts.lottery_pool;
        Self::check_requirement(lottery_pool, maximum_number, lottery_fee)?;
        lottery_pool.is_initialized = true;
        lottery_pool.bump = ctx.bumps.lottery_pool;
        lottery_pool.admin = ctx.accounts.admin.key();
        lottery_pool.pool_id = pool_id;
        lottery_pool.winning_number = 0; // initialize to 0
        lottery_pool.maximum_number = maximum_number;
        lottery_pool.is_drawn = false;
        lottery_pool.prize = 0;
        lottery_pool.bonus_prize = 0;
        lottery_pool.claimed_prize = 0;
        lottery_pool.votes_prize = [0; MAX_VOTE_NUMBERS];
        lottery_pool.votes_amount = [0; MAX_VOTE_NUMBERS];
        lottery_pool.claimed_count = 0;
        lottery_pool.entry_lottery_price = entry_lottery_price;
        lottery_pool.lottery_fee = lottery_fee;

        emit!(InitLotteryPoolEvent {
            admin: lottery_pool.admin,
            lottery_pool: lottery_pool.key(),
            maximum_number,
            entry_lottery_price,
            lottery_fee,
        });
        Ok(())
    }
}
