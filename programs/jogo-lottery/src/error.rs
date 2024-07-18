use anchor_lang::prelude::*;

#[error_code]
pub enum JoGoLotteryErrorCode {
    #[msg("Lottery already initialized")]
    LotteryAlreadyInitialized,
    #[msg("LotteryPool already initialized")]
    LotteryPoolAlreadyInitialized,
    #[msg("LotteryPool end")]
    LotteryPoolEnded,
    #[msg("Already drawn pool")]
    AlreadyDrawnPool,
    #[msg("LotteryPool not closed")]
    PoolNotClosed,
    #[msg("User already claimed")]
    AlreadyClaimed,
    #[msg("Prize is zero")]
    NoPrize,
    #[msg("Prize is insufficient")]
    InsufficientPrize,
    #[msg("Max vote number exceed")]
    MaxVoteNumberExceed,
    #[msg("LotteryPool still leave unclaimed")]
    LotteryPoolCanNotClose,
    #[msg("LotteryPool mismatch")]
    MismatchLotteryPool,

    #[msg("Invalid admin role")]
    InvalidAdminRole,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Invalid vote number")]
    InvalidVoteNumber,
    #[msg("Invalid pool id")]
    InvalidPoolId,
    #[msg("Invalid user")]
    InvalidUser,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Invalid winning number")]
    InvalidWinningNumber,
    #[msg("Invalid buy lottery numbers")]
    InvalidBuyLotteryNumbers,
    #[msg("Invalid lottery fee")]
    InvalidLotteryFee,
    #[msg("Invalid mint account")]
    InvalidMintAccount,
}
