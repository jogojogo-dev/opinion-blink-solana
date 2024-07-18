use anchor_lang::context::CpiContext;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer as sol_transfer, Transfer as SOLTransfer};
use anchor_spl::token::{
    sync_native, transfer as spl_transfer, SyncNative, Transfer as SPLTransfer,
};

pub(crate) fn transfer_sol(
    from: &AccountInfo,
    to: &AccountInfo,
    system_program: &AccountInfo,
    amount: u64,
    is_in: bool,
    seeds: &[&[u8]],
) -> Result<()> {
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
        transfer_sol_ctx = CpiContext::new_with_signer(
            system_program.clone(),
            SOLTransfer {
                from: to.clone(),
                to: from.clone(),
            },
            &[&seeds[..]],
        );
    }
    sol_transfer(transfer_sol_ctx, amount)?;
    Ok(())
}

pub(crate) fn transfer_spl(
    from: &AccountInfo,
    to: &AccountInfo,
    authority: &AccountInfo,
    token_program: &AccountInfo,
    amount: u64,
    is_in: bool,
    seeds: &[&[u8]],
) -> Result<()> {
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
    } else {
        transfer_spl_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            SPLTransfer {
                from: to.clone(),
                to: from.clone(),
                authority: authority.clone(),
            },
            &[&seeds[..]],
        );
    }
    spl_transfer(transfer_spl_ctx, amount)?;
    Ok(())
}

pub fn wrap_sol(
    vault_token_account: &AccountInfo,
    token_program: &AccountInfo,
    seeds: &[&[u8]],
) -> Result<()> {
    let wrap_token_account = SyncNative {
        account: vault_token_account.clone(),
    };
    let wrap_sol_ctx =
        CpiContext::new_with_signer(token_program.clone(), wrap_token_account, &[&seeds[..]]);
    sync_native(wrap_sol_ctx)?;
    Ok(())
}
