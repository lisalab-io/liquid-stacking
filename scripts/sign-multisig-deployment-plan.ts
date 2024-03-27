
// SPDX-License-Identifier: BUSL-1.1

import {
	TransactionSigner,
	compressPublicKey,
	pubKeyfromPrivKey,
	MultiSigSpendingCondition,
	deserializeTransaction,
	StacksTransaction,
	StacksPrivateKey,
	StacksPublicKey,
	Address,
	// broadcastTransaction,
	StacksMessageType,
} from "@stacks/transactions";
import { bytesToHex } from '@stacks/common';
import fs from "fs";
import { getStacksAddress, getStacksPrivateKeys, getStacksPubkeys } from "./config.ts";
import { planFile, assertSigner, equalByteArrays, readPlan, verboseLog } from "./utils.ts";

const privateKeys = getStacksPrivateKeys();
const address = getStacksAddress();
const pubKeys = getStacksPubkeys();
const pubKeysFromPrivate = privateKeys.map(sk => compressPublicKey(pubKeyfromPrivKey(sk.data).data));

function signTx(tx: StacksTransaction, privateKeys: StacksPrivateKey[], pubKeys: StacksPublicKey[], checkSigner: Address) {
	const spendingCondition = tx.auth.spendingCondition as MultiSigSpendingCondition;

	const signatureCount = spendingCondition.fields.reduce((sum, field) => sum + (field.contents.type === StacksMessageType.MessageSignature ? 1 : 0), 0);
	if (signatureCount === spendingCondition.signaturesRequired) {
		verboseLog(`Tried to sign tx ${tx.txid()} but it is already fully signed`);
		return tx;
	}

	const signer = new TransactionSigner(tx);
	const fields = spendingCondition.fields;
	let signatures = 0;

	for (let index = 0; index < fields.length; ++index) {
		const field = fields[index];
		if (field.contents.type !== StacksMessageType.PublicKey) {
			++signatures;
			continue;
		}

		const firstPubKey = field.contents.data as Uint8Array;

		const matchingPubKeyIndex = pubKeysFromPrivate.findIndex(pubkey => equalByteArrays(pubkey.data, firstPubKey));
		if (matchingPubKeyIndex === -1) {
			verboseLog(`Next pubkey to sign tx ${tx.txid()} is ${bytesToHex(firstPubKey)}, but no private key is available for it. It is someone else's turn to sign.`);
			break;
		}

		verboseLog(`Signing sighash ${tx.txid()} with key ${bytesToHex(pubKeysFromPrivate[matchingPubKeyIndex].data)}`);

		// fields are always added to the end, so we have to remove it and manually move it to the right index
		// we have to remove the old field first, otherwise signOrigin might fail if it gets more signatures than expected
		fields.splice(index, 1);
		signer.signOrigin(privateKeys[matchingPubKeyIndex]);
		const newField = fields.pop()!;
		fields.splice(index, 0, newField);
		++signatures;
	}

	const fieldCount = (tx.auth.spendingCondition as MultiSigSpendingCondition).fields.length;

	if (fieldCount !== pubKeys.length)
		throw new Error(`Field count should be ${pubKeys.length} (num sigs + num unused pubkeys), but it is ${fieldCount}`);

	assertSigner(tx.auth.spendingCondition, checkSigner);

	if (signatures === spendingCondition.signaturesRequired)
		verboseLog(`tx ${tx.txid()} is now fully signed`);

	// try {
	// 	const result = tx.verifyOrigin();
	// 	console.log("verify origin", result);
	// }
	// catch (error) {
	// 	console.error(error);
	// 	throw new Error('Verify origin failed');
	// }

	return tx;
}

readPlan()
	.then(plan => plan.map(tx => deserializeTransaction(tx)))
	.then(plan => plan.map(tx => signTx(tx, privateKeys, pubKeys, address)))
	.then(plan => {
		fs.writeFileSync(planFile, JSON.stringify(plan.map(tx => bytesToHex(tx.serialize()))), "utf-8");
		console.log(`Signed deploy plan written to ${planFile}`);
	});
