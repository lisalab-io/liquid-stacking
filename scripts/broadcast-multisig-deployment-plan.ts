import {
	deserializeTransaction,
	getNonce,
	addressToString,
	broadcastTransaction,
	TxBroadcastResult,
} from "@stacks/transactions";
import { getNetwork, getStacksAddress } from "./config.ts";
import { readPlan, verboseLog } from "./utils.ts";

const network = getNetwork();
const address = getStacksAddress();

const additionalFeeMultiplier: bigint = 1n;

readPlan()
	.then(plan => plan.map(tx => deserializeTransaction(tx)))
	.then(async (plan) => {
		const addressString = addressToString(address);
		const currentNonce = await getNonce(addressString, network);
		verboseLog(`${addressString} account nonce is ${currentNonce}`);
		let broadcasts: Promise<TxBroadcastResult>[] = [];
		plan.map(transaction => {
			if (transaction.auth.spendingCondition.nonce < currentNonce)
				return; // already broadcast that transaction
			if (additionalFeeMultiplier > 1)
				transaction.setFee(transaction.auth.spendingCondition.fee * additionalFeeMultiplier);
			broadcasts.push(broadcastTransaction(transaction, network));
			verboseLog(`Broadcasting ${transaction.txid()}`);
		});
		const broadcastResults = await Promise.all(broadcasts);
		console.log(broadcastResults);
	});
