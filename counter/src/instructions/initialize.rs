use {
    crate::state::{CounterAccount, CounterAccountInner},
    quasar_lang::prelude::*,
};

#[derive(Accounts)]
pub struct Initialize {
    #[account(mut)]
    pub owner: Signer,
    #[account(mut, init, payer = owner, seeds = CounterAccount::seeds(owner), bump)]
    pub counter: Account<CounterAccount>,
    #[allow(dead_code)]
    pub system_program: Program<System>,
}

impl Initialize {
    #[inline(always)]
    pub fn initialize(&mut self, bumps: &InitializeBumps) -> Result<(), ProgramError> {
        self.counter.set_inner(CounterAccountInner {
            authority: *self.owner.address(),
            value: 0,
            bump: bumps.counter,
        });
        Ok(())
    }
}
