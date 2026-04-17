import { QuasarSvm, createKeyedSystemAccount } from "@blueshift-gg/quasar-svm/kit";
import { AccountRole, type Address, address, generateKeyPairSigner, getAddressCodec } from "@solana/kit";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  MulitsigClient,
  PROGRAM_ADDRESS,
  findConfigAddress,
  findVaultAddress,
} from "../target/client/typescript/mulitsig/kit.js";

const SYSTEM_PROGRAM_ADDRESS = address("11111111111111111111111111111111");
const MULTISIG_CONFIG_DISCRIMINATOR = 1;
const addressCodec = getAddressCodec();
const client = new MulitsigClient();

async function createVm() {
  const vm = new QuasarSvm();
  vm.addProgram(PROGRAM_ADDRESS, await readFile("target/deploy/mulitsig.so"));
  return vm;
}

function getConfig(result: { account: (accountAddress: Address) => { data: Uint8Array } | null }, configAddress: Address) {
  const config = result.account(configAddress);
  expect(config).not.toBeNull();
  const data = config!.data;

  expect(data[0]).toBe(MULTISIG_CONFIG_DISCRIMINATOR);

  const creator = addressCodec.decode(data.subarray(1, 33));
  const threshold = data[33];
  const bump = data[34];
  const labelLength = data[35];
  const signerCount = data[36]! | (data[37]! << 8);
  const labelOffset = 38;
  const label = new TextDecoder().decode(data.subarray(labelOffset, labelOffset + labelLength));
  const signersOffset = labelOffset + labelLength;
  const signers = Array.from({ length: signerCount }, (_, index) => {
    const start = signersOffset + index * 32;
    return addressCodec.decode(data.subarray(start, start + 32));
  });

  return { bump, creator, label, signers, threshold };
}

function getLamports(
  result: { account: (accountAddress: Address) => { lamports: bigint | number } | null },
  accountAddress: Address,
) {
  const account = result.account(accountAddress);
  expect(account).not.toBeNull();
  return BigInt(account!.lamports);
}

function readonlySigner(address: Address) {
  return { address, role: AccountRole.READONLY_SIGNER };
}

async function createMultisig(vm: QuasarSvm, threshold = 2) {
  const [creator, signer1, signer2, signer3] = await Promise.all([
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
    generateKeyPairSigner(),
  ]);
  const signers = [signer1, signer2, signer3];
  const configAddress = await findConfigAddress(creator.address);

  const createInstruction = await client.createCreateInstruction({
    creator: creator.address,
    threshold,
    remainingAccounts: signers.map((signer) => readonlySigner(signer.address)),
  });
  const createResult = vm.processInstruction(createInstruction, [
    createKeyedSystemAccount(creator.address),
    createKeyedSystemAccount(configAddress, 0n),
    ...signers.map((signer) => createKeyedSystemAccount(signer.address)),
  ]);
  createResult.assertSuccess();

  return { configAddress, creator, result: createResult, signers };
}

describe("Mulitsig Program", () => {
  it("creates a config, accepts deposits, and executes a threshold-approved transfer", async () => {
    const vm = await createVm();
    const { configAddress, creator, result: createResult, signers } = await createMultisig(vm);
    const config = getConfig(createResult, configAddress);

    expect(config.bump).toBeGreaterThan(0);
    expect(config.creator).toBe(creator.address);
    expect(config.label).toBe("");
    expect(config.threshold).toBe(2);
    expect(config.signers).toEqual(signers.map((signer) => signer.address));

    const depositor = await generateKeyPairSigner();
    const depositAmount = 1_000_000_000n;
    const vaultAddress = await findVaultAddress(configAddress);
    const depositInstruction = await client.createDepositInstruction({
      depositor: depositor.address,
      config: configAddress,
      amount: depositAmount,
    });
    const depositResult = vm.processInstruction(depositInstruction, [
      ...createResult.accounts,
      createKeyedSystemAccount(depositor.address),
      createKeyedSystemAccount(vaultAddress, 0n),
    ]);
    depositResult.assertSuccess();

    expect(getLamports(depositResult, vaultAddress)).toBe(depositAmount);

    const recipient = await generateKeyPairSigner();
    const transferAmount = 400_000_000n;
    const executeInstruction = await client.createExecuteTransferInstruction({
      creator: creator.address,
      recipient: recipient.address,
      amount: transferAmount,
      remainingAccounts: signers.slice(0, 2).map((signer) => readonlySigner(signer.address)),
    });
    const executeResult = vm.processInstruction(executeInstruction, [
      ...depositResult.accounts,
      createKeyedSystemAccount(recipient.address, 0n),
    ]);
    executeResult.assertSuccess();

    expect(getLamports(executeResult, recipient.address)).toBe(transferAmount);
    expect(getLamports(executeResult, vaultAddress)).toBe(depositAmount - transferAmount);
  });

  it("rejects transfers when approvals are below the configured threshold", async () => {
    const vm = await createVm();
    const { configAddress, creator, result: createResult, signers } = await createMultisig(vm);
    const depositor = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();
    const depositAmount = 750_000_000n;
    const vaultAddress = await findVaultAddress(configAddress);

    const depositInstruction = await client.createDepositInstruction({
      depositor: depositor.address,
      config: configAddress,
      amount: depositAmount,
    });
    const depositResult = vm.processInstruction(depositInstruction, [
      ...createResult.accounts,
      createKeyedSystemAccount(depositor.address),
      createKeyedSystemAccount(vaultAddress, 0n),
    ]);
    depositResult.assertSuccess();

    const executeInstruction = await client.createExecuteTransferInstruction({
      creator: creator.address,
      recipient: recipient.address,
      amount: 250_000_000n,
      remainingAccounts: [readonlySigner(signers[0].address)],
    });
    const executeResult = vm.processInstruction(executeInstruction, [
      ...depositResult.accounts,
      createKeyedSystemAccount(recipient.address, 0n),
    ]);

    expect(executeResult.status.ok, executeResult.logs.join("\n")).toBe(false);
    expect(getLamports(executeResult, recipient.address)).toBe(0n);
    expect(getLamports(executeResult, vaultAddress)).toBe(depositAmount);
  });

  it("stores label updates on the multisig config account", async () => {
    const vm = await createVm();
    const { configAddress, creator, result: createResult } = await createMultisig(vm);

    const setLabelInstruction = await client.createSetLabelInstruction({
      creator: creator.address,
      label: "Treasury",
    });
    const setLabelResult = vm.processInstruction(setLabelInstruction, createResult.accounts);
    setLabelResult.assertSuccess();

    expect(getConfig(setLabelResult, configAddress).label).toBe("Treasury");
  });

  it("rejects invalid UTF-8 label data without mutating the config", async () => {
    const vm = await createVm();
    const { configAddress, creator, result: createResult } = await createMultisig(vm);

    const invalidSetLabelInstruction = {
      programAddress: PROGRAM_ADDRESS,
      accounts: [
        { address: creator.address, role: AccountRole.WRITABLE_SIGNER },
        { address: configAddress, role: AccountRole.WRITABLE },
        { address: SYSTEM_PROGRAM_ADDRESS, role: AccountRole.READONLY },
      ],
      data: Uint8Array.from([2, 2, 0xc3, 0x28]),
    };
    const invalidResult = vm.processInstruction(invalidSetLabelInstruction, createResult.accounts);

    expect(invalidResult.status.ok, invalidResult.logs.join("\n")).toBe(false);
    expect(getConfig(invalidResult, configAddress).label).toBe("");
  });
});
