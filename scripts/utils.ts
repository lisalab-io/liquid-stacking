
// SPDX-License-Identifier: BUSL-1.1

import { Address, SpendingCondition, StacksPublicKey } from "@stacks/transactions";
import { initSimnet } from '@hirosystems/clarinet-sdk';
import YAML from 'yaml';
import fs from "fs";
import { isMainnet } from "./config.ts";

const verbose = true;

export const manifestFile = './Clarinet.toml';
export const simnetDeployFile = 'deployments/default.simnet-plan.yaml';
export const planFile = "plan.json";

const mainnetDeploy = isMainnet();

export type PlanItem = {
	contractName: string;
	codeBody: string;
	path: string;
	clarityVersion: number;
};

export function verboseLog(...args: any[]) {
	verbose && console.log.apply(null, args);
}

export function equalPubKeys(a: StacksPublicKey, b: StacksPublicKey) {
	if (a.type !== b.type)
		return false;
	return equalByteArrays(a.data, b.data);
}

export function equalByteArrays(a: Uint8Array, b: Uint8Array) {
	if (a.byteLength !== b.byteLength)
		return false;
	for (let i = 0; i < a.byteLength; ++i)
		if (a[i] !== b[i])
			return false;
	return true;
}

export function assertSigner(spendingCondition: SpendingCondition, signer: Address) {
	if (spendingCondition.signer !== signer.hash160)
		throw new Error(`Signer mismatch, expected ${signer.hash160}, got ${spendingCondition.signer}`);
}

export async function readPlan() {
	const content = await fs.promises.readFile(planFile, "utf-8");
	const plan = JSON.parse(content);
	if (plan.constructor !== Array)
		throw new Error(`Plan corrupt, not an array`);
	for (const entry of plan)
		if (typeof entry !== "string")
			throw new Error(`Plan corrupt, entry not a string: ${entry}`);
	return plan;
}

export function shouldDeployContract(contractPath: string) {
	// if (!isMainnet())
	// 	return true;
	return (
		!contractPath.startsWith('contracts_modules/') &&
		!contractPath.startsWith('./.cache/') &&
		!contractPath.startsWith('contracts/mocks/')
	);
}

function replaceMainnetToTestnetAddresses(codeBody: string, testnetAddressReplacements: { [key: string]: string }) {
	for (const [find, replace] of Object.entries(testnetAddressReplacements))
		codeBody = codeBody.replace(new RegExp(find, 'g'), replace);
	return codeBody;
}

export async function deployPlan(testnetAddressReplacements: { [key: string]: string }): Promise<PlanItem[]> {
	const simnet = await initSimnet(manifestFile);
	simnet.getContractsInterfaces(); // creates simnet deploy plan
	const simnetPlan = YAML.parse(fs.readFileSync(simnetDeployFile, 'utf-8'));
	const plan = simnetPlan.plan.batches
		.flatMap((batch: any) =>
			batch.transactions.map((transaction: any) => {
				const item = transaction['emulated-contract-publish'];
				if (shouldDeployContract(item.path as string)) {
					const codeBody = fs.readFileSync(item.path, 'utf-8');
					const deployCodeBody = mainnetDeploy
						? codeBody
						: replaceMainnetToTestnetAddresses(codeBody, testnetAddressReplacements);
					if (codeBody !== deployCodeBody) {
						verboseLog(`Made testnet address replacements in ${item['contract-name']}`);
					}
					return {
						contractName: item['contract-name'],
						codeBody: deployCodeBody,
						path: item.path,
						clarityVersion: item['clarity-version'],
					};
				}
				return null;
			})
		)
		.filter((item: any) => item !== null);
	return plan;
}