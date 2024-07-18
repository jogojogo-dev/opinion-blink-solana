use anchor_lang::context::CpiContext;
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer as sol_transfer, Transfer as SOLTransfer};
use anchor_spl::token::{
    sync_native, transfer as spl_transfer, SyncNative, Transfer as SPLTransfer,
};
use crate::{LOTTERY_POOL, LotteryPool};

pub(crate) fn transfer_sol<'a>(
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    amount: u64,
    is_in: bool,
    seeds: &[&[u8]],
) -> Result<()> {
    let transfer_sol_ctx;
    let signed_seeds= &[&seeds[..]];
    if is_in {
        transfer_sol_ctx = CpiContext::new(
            system_program,
            SOLTransfer {
                from,
                to,
            },
        );
    } else {
        transfer_sol_ctx = CpiContext::new_with_signer(
            system_program,
            SOLTransfer {
                from,
                to,
            },
           signed_seeds,
        );
    }
    sol_transfer(transfer_sol_ctx, amount)?;
    Ok(())
}

pub(crate) fn transfer_spl<'a>(
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    authority: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    amount: u64,
    is_in: bool,
    seeds: &[&[u8]],
) -> Result<()> {
    let transfer_spl_ctx;
    let signed_seeds= &[&seeds[..]];
    if is_in {
        transfer_spl_ctx = CpiContext::new(
            token_program,
            SPLTransfer {
                from,
                to,
                authority,
            },
        );
    } else {
        transfer_spl_ctx = CpiContext::new_with_signer(
            token_program.clone(),
            SPLTransfer {
                from,
                to,
                authority,
            },
            signed_seeds,
        );
    }
    spl_transfer(transfer_spl_ctx, amount)?;
    Ok(())
}

pub fn wrap_sol<'a>(
    vault_token_account: AccountInfo<'a>,
    token_program: AccountInfo<'a>,
    seeds: &[&[u8]],
) -> Result<()> {
    let wrap_token_account = SyncNative {
        account: vault_token_account
    };
    let signed_seeds= &[&seeds[..]];
    let wrap_sol_ctx =
        CpiContext::new_with_signer(token_program, wrap_token_account, signed_seeds);
    sync_native(wrap_sol_ctx)?;
    Ok(())
}

#[macro_export]
macro_rules! generate_seeds {
    ($lottery_pool: expr, $admin_key: expr) => {
        &[
            LOTTERY_POOL,
            $admin_key.as_ref(),
            $lottery_pool.pool_id.as_ref(),
            &[$lottery_pool.bump]
        ]
    };
}