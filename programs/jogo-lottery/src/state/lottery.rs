use anchor_lang::prelude::*;

#[account]
pub struct LotteryPool {
    pub admin: Pubkey,
    pub prize: u64,
    pub bonus_prize: u64,
    pub claimed_prize: u64,
    pub maximum_number: u64,
    pub winning_number: u64,
    pub deadline: u64,
    pub is_initialized: bool,
    pub is_drawn: bool,
    pub bump: u8,
    pub vault_bump: u8,
    pub pool_id: [u8;32],
}

#[account]
pub struct UserLottery {
    pub owner: Pubkey,
    pub lottery_pool: Pubkey,
    pub balance: u64,
    pub vote_number: u64,
    pub bump: u8,
    pub is_claimed: bool
}