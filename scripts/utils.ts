import { Address, SpendingCondition, StacksPublicKey } from "@stacks/transactions";

const verbose = true;

export function verboseLog(...args: any[]) {
	verbose && console.log.apply(null, args);
}

export function equalPubKeys(a: StacksPublicKey, b: StacksPublicKey) {
	if (a.type !== b.type || a.data.byteLength !== b.data.byteLength)
		return false;
	for (let i = 0; i < a.data.byteLength; ++i)
		if (a.data[i] !== b.data[i])
			return false;
	return true;
}

export function assertSigner(spendingCondition: SpendingCondition, signer: Address) {
	if (spendingCondition.signer !== signer.hash160)
		throw new Error(`Signer mismatch, expected ${signer}, got ${spendingCondition.signer}`);
}