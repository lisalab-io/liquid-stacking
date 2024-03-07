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
} from "@stacks/transactions";
import { bytesToHex } from '@stacks/common';
import fs from "fs";
import { getStacksAddress, getStacksPrivateKeys, getStacksPubkeys } from "./config.ts";
import { assertSigner, equalPubKeys } from "./utils.ts";

const planFile = "plan.json";

const privateKeys = getStacksPrivateKeys();
const address = getStacksAddress();
const pubKeys = getStacksPubkeys();

function signTx(tx: StacksTransaction, privateKeys: StacksPrivateKey[], pubKeys: StacksPublicKey[], checkSigner: Address) {
	const signer = new TransactionSigner(tx);
	let unusedPubkeys = pubKeys.slice();
	for (const sk of privateKeys) {
		const pk = compressPublicKey(pubKeyfromPrivKey(sk.data).data);
		unusedPubkeys = unusedPubkeys.filter(epk => !equalPubKeys(epk, pk));
		signer.signOrigin(sk);
	}
	for (const pk of unusedPubkeys)
		signer.appendOrigin(pk);

	const fieldCount = (tx.auth.spendingCondition as MultiSigSpendingCondition).fields.length;

	if (fieldCount !== pubKeys.length)
		throw new Error(`Field count should be ${pubKeys.length} (num sigs + num unused pubkeys), but it is ${fieldCount}`);

	assertSigner(tx.auth.spendingCondition, checkSigner);

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

async function readPlan() {
	const content = await fs.promises.readFile(planFile, "utf-8");
	const plan = JSON.parse(content);
	if (plan.constructor !== Array)
		throw new Error(`Plan corrupt, not an array`);
	for (const entry of plan)
		if (typeof entry !== "string")
			throw new Error(`Plan corrupt, entry not a string: ${entry}`);
	return plan;
}

readPlan()
	.then(plan => plan.map(tx => deserializeTransaction(tx)))
	.then(plan => plan.map(tx => signTx(tx, privateKeys, pubKeys, address)))
	.then(plan => {
		fs.writeFileSync(planFile, JSON.stringify(plan.map(tx => bytesToHex(tx.serialize()))), "utf-8");
		console.log(`Signed deploy plan written to ${planFile}`);
	});
