#![allow(dead_code)]
#![allow(unused_imports)]
pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("BsEhRH3RcMmgjctKfH5KJd8yu2BYgvECZb2UEmZ2dPh1");

#[program]
pub mod jogo_lottery {
    use super::*;

    pub fn init_lottery_pool(
        ctx: Context<InitLotteryPool>,
        pool_id: [u8; 32],
        maximum_number: u64,
        entry_lottery_price: u64,
        lottery_fee: u64,
    ) -> Result<()> {
        InitLotteryPoolEntry::initialize_lottery_pool(
            ctx,
            pool_id,
            maximum_number,
            entry_lottery_price,
            lottery_fee,
        )
    }

    pub fn buy_lottery_ticket(
        ctx: Context<EnterLotteryPool>,
        vote_number: u64,
        buy_lottery_numbers: u64,
        use_sol: bool,
    ) -> Result<()> {
        EnterLotteryPoolEntry::enter_lottery_pool(ctx, vote_number, buy_lottery_numbers, use_sol)
    }

    pub fn prepare_draw_lottery(
        ctx: Context<DrawLotteryPool>,
        winning_number: u64,
        bonus_lottery_prize: u64,
        use_sol: bool,
    ) -> Result<()> {
        DrawLotteryPoolEntry::draw_lottery_sol_pool(
            ctx,
            winning_number,
            bonus_lottery_prize,
            use_sol,
        )
    }

    pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
        ClaimPrizeEntry::claim_prize(ctx)
    }

    pub fn close_lottery_pool(ctx: Context<CloseLotteryPool>) -> Result<()> {
        CloseLotteryPoolEntry::close_lottery_pool(ctx)
    }
}
