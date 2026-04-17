use {
    crate::{errors::MyError, state::CounterAccount},
    quasar_lang::prelude::*,
};

#[derive(Accounts)]
pub struct Delete {
    #[account(mut)]
    pub owner: Signer,
    #[account(
        mut,
        constraint = counter.authority == *owner.address() @ MyError::Unauthorized,
        close = owner,
        seeds = CounterAccount::seeds(owner),
        bump = counter.bump
    )]
    pub counter: Account<CounterAccount>,
}

impl Delete {
    #[inline(always)]
    pub fn delete(&self) -> Result<(), ProgramError> {
        Ok(())
    }
}
