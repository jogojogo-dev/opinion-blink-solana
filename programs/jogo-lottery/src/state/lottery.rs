use anchor_lang::prelude::*;
use crate::error::JoGoLotteryErrorCode;

pub const MAX_VOTE_NUMBERS: usize = 32;

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
    pub vault_bump: u8,
    pub pool_id: [u8;32],
    pub votes_prize: [u64; MAX_VOTE_NUMBERS],
}

impl LotteryPool {
    pub fn calculate_prize(&self, user_prize: u64) -> u64 {
        let vote_prize = self.votes_prize[(self.winning_number) as usize];
        assert_ne!(vote_prize, 0, "Insufficient vote prize");
        (self.prize + self.bonus_prize) * user_prize / vote_prize
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