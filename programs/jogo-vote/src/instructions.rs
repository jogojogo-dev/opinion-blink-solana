use anchor_lang::prelude::*;
use crate::state::{JoGoVoteState, VoteAccount};
use crate::error::VoteError;

#[derive(Accounts)]
pub struct InitializeState<'info> {
    #[account(
        init_if_needed,
        payer=admin,
        space = JoGoVoteState::SIZE,
        seeds = [b"state", admin.key().as_ref()],
        bump
    )]
    pub state: Account<'info, JoGoVoteState>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(
        mut,
    )]
    pub state: Account<'info, JoGoVoteState>,
    // Add other accounts as needed
    #[account(mut, signer)]
    pub payer: Signer<'info>,
    #[account(signer)]
    pub voter: Signer<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [b"vote_account", voter.key().as_ref()],
        bump,
        space = VoteAccount::SIZE,
    )]
    pub vote_account: Account<'info, VoteAccount>,
    pub system_program: Program<'info, System>
}

pub fn initialize_state(ctx: Context<InitializeState>, max_vote_numbers: u8) -> Result<()> {
    let state = &mut ctx.accounts.state;
    state.bump = ctx.bumps.state;
    state.admin = ctx.accounts.admin.key();
    state.max_vote_numbers = max_vote_numbers;
    state.total_voter_numbers = 0;
    state.each_vote_numbers = [0; 256];
    Ok(())
}

pub fn cast_vote(ctx: Context<Vote>, vote_number: u8) -> Result<()> {
    let state = &mut ctx.accounts.state;
    let vote_account = &mut ctx.accounts.vote_account;
    require!(vote_account.is_voted == false, VoteError::AlreadyVoted);
    require!(vote_number > 0 && vote_number <= state.max_vote_numbers, VoteError::InvalidVoteNumber);

    if vote_account.voter == Pubkey::default() {
        vote_account.voter = ctx.accounts.voter.key();
        state.each_vote_numbers[vote_number as usize] += 1;
        state.total_voter_numbers += 1;
        vote_account.voted_number = vote_number;
        vote_account.is_voted = true;
        vote_account.bump = ctx.bumps.vote_account;
    } else {
        panic!("voter already vote");
    }
    Ok(())
}