use crate::error::JoGoLotteryErrorCode;
use crate::MAX_VOTE_NUMBERS;
use anchor_lang::prelude::*;
use std::char::MAX;

#[account]
pub struct LotteryPool {
    pub admin: Pubkey,
    pub prize: u64,
    pub bonus_prize: u64,
    pub claimed_prize: u64,
    pub maximum_number: u64,
    pub winning_number: u64,
    pub is_initialized: bool,
    pub is_drawn: bool,
    pub bump: u8,
    pub pool_id: [u8; 32],
    pub votes_count: [u64; MAX_VOTE_NUMBERS],
    pub votes_prize: [u64; MAX_VOTE_NUMBERS],
    pub claimed_count: u64,
    pub entry_lottery_price: u64,
    pub lottery_fee: u64, // base on 1000, 309 = 30.9%
}

impl LotteryPool {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();

    pub fn calculate_prize(&self, user_prize: u64) -> u64 {
        let vote_prize = self.votes_prize[self.winning_number as usize];
        assert_ne!(vote_prize, 0, "Insufficient vote prize");
        (((self.prize + self.bonus_prize) as u128) * (user_prize as u128) / (vote_prize as u128))
            as u64
    }
}

#[account]
pub struct UserLottery {
    pub owner: Pubkey,
    pub lottery_pool: Pubkey,
    pub balance: u64,
    pub vote_number: u64,
    pub claimed_prize: u64,
    pub bump: u8,
    pub is_claimed: bool,
}

impl UserLottery {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}
