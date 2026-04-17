#![cfg_attr(not(test), no_std)]

use quasar_lang::prelude::*;

mod instructions;
use instructions::*;

declare_id!("9dzwDTsF82ned4k7RVgjwddRAwKqdZsrfPpT941JR96F");

#[program]
mod vault {
    use super::*;

    #[instruction(discriminator = 0)]
    pub fn deposit(ctx: Ctx<Deposit>, amount: u64) -> Result<(), ProgramError> {
        ctx.accounts.deposit(amount)
    }

    #[instruction(discriminator = 1)]
    pub fn withdraw(ctx: Ctx<Withdraw>, amount: u64) -> Result<(), ProgramError> {
        ctx.accounts.withdraw(amount, &ctx.bumps)
    }
}
