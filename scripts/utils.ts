
// SPDX-License-Identifier: BUSL-1.1

import { Address, SpendingCondition, StacksPublicKey } from "@stacks/transactions";
import fs from "fs";

const verbose = true;

export const planFile = "plan.json";

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