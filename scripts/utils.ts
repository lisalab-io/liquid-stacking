import { Address, SpendingCondition, StacksPublicKey } from "@stacks/transactions";

const verbose = true;

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
		throw new Error(`Signer mismatch, expected ${signer}, got ${spendingCondition.signer}`);
}