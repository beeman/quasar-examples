#![cfg_attr(not(test), no_std)]
#![allow(dead_code)]

use quasar_lang::prelude::*;

mod instructions;
use instructions::*;
mod state;

declare_id!("3zhNkZNAnAaqKTrocU5yKUVSD1gQtw7NaxYopBw2a2S4");

#[program]
mod mulitsig {
    use super::*;

    #[instruction(discriminator = 0)]
    pub fn create(ctx: CtxWithRemaining<Create>, threshold: u8) -> Result<(), ProgramError> {
        ctx.accounts
            .create_multisig(threshold, &ctx.bumps, ctx.remaining_accounts())
    }

    #[instruction(discriminator = 1)]
    pub fn deposit(ctx: Ctx<Deposit>, amount: u64) -> Result<(), ProgramError> {
        ctx.accounts.deposit(amount)
    }

    #[instruction(discriminator = 2)]
    pub fn set_label(ctx: Ctx<SetLabel>, label: String<32>) -> Result<(), ProgramError> {
        ctx.accounts.update_label(label)
    }

    #[instruction(discriminator = 3)]
    pub fn execute_transfer(
        ctx: CtxWithRemaining<ExecuteTransfer>,
        amount: u64,
    ) -> Result<(), ProgramError> {
        ctx.accounts
            .verify_and_transfer(amount, &ctx.bumps, ctx.remaining_accounts())
    }
}
