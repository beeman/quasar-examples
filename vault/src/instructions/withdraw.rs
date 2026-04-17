use quasar_lang::prelude::*;

#[derive(Accounts)]
pub struct Withdraw {
    #[account(mut)]
    pub user: Signer,
    #[account(mut, seeds = [b"vault", user], bump)]
    pub vault: UncheckedAccount,
    pub system_program: Program<System>,
}

impl Withdraw {
    #[inline(always)]
    pub fn withdraw(&self, amount: u64, bumps: &WithdrawBumps) -> Result<(), ProgramError> {
        let seeds = self.vault_seeds(bumps);
        self.system_program
            .transfer(&self.vault, &self.user, amount)
            .invoke_signed(&seeds)
    }
}
