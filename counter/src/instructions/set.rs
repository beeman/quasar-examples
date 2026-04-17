use {
    crate::{errors::MyError, state::CounterAccount},
    quasar_lang::prelude::*,
};

#[derive(Accounts)]
pub struct Set {
    pub owner: Signer,
    #[account(
        mut,
        constraint = counter.authority == *owner.address() @ MyError::Unauthorized,
        seeds = CounterAccount::seeds(owner),
        bump = counter.bump
    )]
    pub counter: Account<CounterAccount>,
}

impl Set {
    #[inline(always)]
    pub fn set(&mut self, value: u64) -> Result<(), ProgramError> {
        self.counter.value = value.into();
        Ok(())
    }
}
