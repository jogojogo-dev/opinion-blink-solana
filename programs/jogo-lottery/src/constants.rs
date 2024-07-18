use anchor_lang::prelude::*;

#[constant]
pub const WRAPPED_SOL: &str = "So11111111111111111111111111111111111111112";

#[constant]
pub const MAX_VOTE_NUMBERS: usize = 16;

#[constant]
pub const USER_LOTTERY: &[u8] = b"user_lottery";

#[constant]
pub const LOTTERY_POOL: &[u8] = b"lottery_pool";
