use anchor_lang::prelude::*;

#[error_code]
pub enum VoteError {
    #[msg("User already vote")]
    AlreadyVoted,
    #[msg("Invalid vote number")]
    InvalidVoteNumber,
}
