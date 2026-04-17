import { QuasarSvm, createKeyedSystemAccount } from "@blueshift-gg/quasar-svm/kit";
import { type Address, AccountRole, generateKeyPairSigner } from "@solana/kit";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { PROGRAM_ADDRESS, VaultClient, findVaultAddress } from "../target/client/typescript/vault/kit.js";

const client = new VaultClient();
const depositAmount = 1_000_000_000n;
const initialLamports = 10_000_000_000n;
const withdrawAmount = 400_000_000n;

async function createVm() {
  const vm = new QuasarSvm();
  vm.addProgram(PROGRAM_ADDRESS, await readFile("target/deploy/vault.so"));
  return vm;
}

function getLamports(
  result: { account: (accountAddress: Address) => { lamports: bigint | number } | null },
  accountAddress: Address,
) {
  const account = result.account(accountAddress);
  expect(account).not.toBeNull();
  return BigInt(account!.lamports);
}

describe("Vault Program", () => {
  it("deposits lamports into the user PDA and withdraws them later", async () => {
    const vm = await createVm();
    const user = await generateKeyPairSigner();
    const vaultAddress = await findVaultAddress(user.address);

    const depositInstruction = await client.createDepositInstruction({
      amount: depositAmount,
      user: user.address,
    });
    const depositResult = vm.processInstruction(depositInstruction, [
      createKeyedSystemAccount(user.address, initialLamports),
      createKeyedSystemAccount(vaultAddress, 0n),
    ]);
    depositResult.assertSuccess();

    expect(getLamports(depositResult, user.address)).toBe(initialLamports - depositAmount);
    expect(getLamports(depositResult, vaultAddress)).toBe(depositAmount);

    const withdrawInstruction = await client.createWithdrawInstruction({
      amount: withdrawAmount,
      user: user.address,
    });
    const withdrawResult = vm.processInstruction(withdrawInstruction, depositResult.accounts);
    withdrawResult.assertSuccess();

    expect(getLamports(withdrawResult, user.address)).toBe(initialLamports - depositAmount + withdrawAmount);
    expect(getLamports(withdrawResult, vaultAddress)).toBe(depositAmount - withdrawAmount);
  });

  it("rejects withdrawals when the passed vault PDA does not match the signer", async () => {
    const vm = await createVm();
    const [attacker, user] = await Promise.all([generateKeyPairSigner(), generateKeyPairSigner()]);
    const userVaultAddress = await findVaultAddress(user.address);

    const depositInstruction = await client.createDepositInstruction({
      amount: depositAmount,
      user: user.address,
    });
    const depositResult = vm.processInstruction(depositInstruction, [
      createKeyedSystemAccount(attacker.address, initialLamports),
      createKeyedSystemAccount(user.address, initialLamports),
      createKeyedSystemAccount(userVaultAddress, 0n),
    ]);
    depositResult.assertSuccess();

    const withdrawInstruction = await client.createWithdrawInstruction({
      amount: withdrawAmount,
      user: attacker.address,
    });
    expect(withdrawInstruction.accounts).toBeDefined();

    const unauthorizedWithdrawInstruction = {
      ...withdrawInstruction,
      accounts: withdrawInstruction.accounts!.map((account, index) =>
        index === 1 ? { ...account, address: userVaultAddress, role: AccountRole.WRITABLE } : account,
      ),
    };
    const unauthorizedWithdrawResult = vm.processInstruction(unauthorizedWithdrawInstruction, depositResult.accounts);

    expect(unauthorizedWithdrawResult.status.ok, unauthorizedWithdrawResult.logs.join("\n")).toBe(false);
    expect(getLamports(unauthorizedWithdrawResult, attacker.address)).toBe(initialLamports);
    expect(getLamports(unauthorizedWithdrawResult, user.address)).toBe(initialLamports - depositAmount);
    expect(getLamports(unauthorizedWithdrawResult, userVaultAddress)).toBe(depositAmount);
  });
});
