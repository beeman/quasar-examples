use {
    crate::{errors::MyError, state::CounterAccount},
    quasar_lang::prelude::*,
};

#[derive(Accounts)]
pub struct Decrement {
    pub owner: Signer,
    #[account(
        mut,
        constraint = counter.authority == *owner.address() @ MyError::Unauthorized,
        seeds = CounterAccount::seeds(owner),
        bump = counter.bump
    )]
    pub counter: Account<CounterAccount>,
}

impl Decrement {
    #[inline(always)]
    pub fn decrement(&mut self) -> Result<(), ProgramError> {
        let value = self.counter.value.checked_sub(1).ok_or(MyError::Underflow)?;
        self.counter.value = value.into();
        Ok(())
    }
}
