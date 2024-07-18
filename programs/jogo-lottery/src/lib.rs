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

declare_id!("Aoixk6qpR4xLTiDaPt8apr9yN79BZPfXS8gnMsrYfGT2");

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

    // pub fn prepare_draw_lottery(
    //     ctx: Context<DrawLotteryPool>,
    //     winning_number: u64,
    //     bonus_lottery_prize: u64,
    // ) -> Result<()> {
    //     _draw_lottery_pool(ctx, winning_number, bonus_lottery_prize)
    // }
    //
    // pub fn buy_lottery_ticket(
    //     ctx: Context<EnterLotteryPool>,
    //     vote_number: u64,
    //     buy_lottery_numbers: u64,
    // ) -> Result<()> {
    //     _enter_lottery_pool(ctx, vote_number, buy_lottery_numbers)
    // }
    //
    // pub fn claim_prize(ctx: Context<ClaimPrize>) -> Result<()> {
    //     _claim_prize(ctx)
    // }
    //
    // pub fn close_lottery_pool(ctx: Context<CloseLotteryPool>) -> Result<()> {
    //     _close_lottery_pool(ctx)
    // }
}
