use anchor_lang::prelude::*;

#[constant]
pub const SEED: &str = "anchor";

#[constant]
pub const MAX_VOTE_NUMBERS: usize = 16;

#[constant]
pub const USER_LOTTERY: &[u8] = b"user_lottery";

#[constant]
pub const LOTTERY_POOL: &[u8] = b"lottery_pool";

#[constant]
pub const LOTTERY_POOL_SOL: &[u8] = b"lottery_pool_sol";
