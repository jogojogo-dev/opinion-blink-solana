use anchor_lang::prelude::*;

#[account]
pub struct JoGoVoteState {
    pub admin: Pubkey,
    pub bump: u8,
    pub max_vote_numbers: u8,
    pub total_voter_numbers: u64,
    pub each_vote_numbers: [u8; 256],
}

impl JoGoVoteState {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}

#[account]
pub struct VoteAccount {
    pub voter: Pubkey,
    pub voted_number: u8,
    pub is_voted: bool,
    pub bump: u8,
}

impl VoteAccount {
    pub const SIZE: usize = 8 + std::mem::size_of::<Self>();
}