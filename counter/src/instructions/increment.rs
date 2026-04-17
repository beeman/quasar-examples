use {
    crate::{errors::MyError, state::CounterAccount},
    quasar_lang::prelude::*,
};

#[derive(Accounts)]
pub struct Increment {
    pub owner: Signer,
    #[account(
        mut,
        constraint = counter.authority == *owner.address() @ MyError::Unauthorized,
        seeds = CounterAccount::seeds(owner),
        bump = counter.bump
    )]
    pub counter: Account<CounterAccount>,
}

impl Increment {
    #[inline(always)]
    pub fn increment(&mut self) -> Result<(), ProgramError> {
        let value = self.counter.value.checked_add(1).ok_or(MyError::Overflow)?;
        self.counter.value = value.into();
        Ok(())
    }
}
