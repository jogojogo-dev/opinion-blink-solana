use anchor_lang::context::CpiContext;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer as sol_transfer, Transfer as SOLTransfer};
use anchor_spl::token::{transfer as spl_transfer, Transfer as SPLTransfer};

pub fn transfer_sol(
    from: &AccountInfo,
    to: &AccountInfo,
    system_program: &AccountInfo,
    amount: u64,
    is_in: bool,
    seeds: &[&[u8]],
) {
    let transfer_sol_ctx;
    if is_in {
        transfer_sol_ctx = CpiContext::new(
            system_program.clone(),
            SOLTransfer {
                from: from.clone(),
                to: to.clone(),
            },
        );
    } else {
        let signed_seeds = &[&seeds[..]];
        transfer_sol_ctx = CpiContext::new_with_signer(
            system_program.clone(),
            SOLTransfer {
                from: to.clone(),
                to: from.clone(),
            },
            signed_seeds,
        );
    }
    sol_transfer(transfer_sol_ctx, amount)?;
}

pub fn transfer_spl(
    from: &AccountInfo,
    to: &AccountInfo,
    authority: &AccountInfo,
    token_program: &AccountInfo,
    amount: u64,
    is_in: bool,
    seeds: &[&[u8]],
) {
    let transfer_spl_ctx;
    if is_in {
        transfer_spl_ctx = CpiContext::new(
            token_program.clone(),
            SPLTransfer {
                from: from.clone(),
                to: to.clone(),
                authority: authority.clone(),
            },
        );
        spl_transfer(transfer_spl_ctx, amount)?;
    } else {
        let signed_seeds = &[&seeds[..]];
        transfer_spl_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            SPLTransfer {
                from: to.clone(),
                to: from.clone(),
                authority: authority.clone(),
            },
            signed_seeds,
        );
        spl_transfer(transfer_spl_ctx, amount)?;
    }
}
