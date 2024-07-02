pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("Dh8AmCC1J8FUD6GnzJtc6hQhUhgndVbBbkKY6HyAa2nv");

#[program]
pub mod jogo_vote {
    use super::*;

    pub fn initialize(ctx: Context<InitializeState>, max_vote_numbers: u8) -> Result<()> {
        initialize_state(ctx, max_vote_numbers)
    }

    pub fn vote(ctx: Context<Vote>, vote_number: u8) -> Result<()> {
        cast_vote(ctx, vote_number)
    }
}
