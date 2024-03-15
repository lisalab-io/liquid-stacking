
// SPDX-License-Identifier: BUSL-1.1

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
		let currentNonce = 0n;
		try {
			currentNonce = await getNonce(addressString, network);
		}
		catch (error) {
			console.log('Failed to fetch current nonce - might happen on devnet');
		}
		verboseLog(`${addressString} account nonce is ${currentNonce}`);
		let broadcasts: Promise<TxBroadcastResult>[] = [];
		plan.map(transaction => {
			if (transaction.auth.spendingCondition.nonce < currentNonce) {
				verboseLog(`Skipping transaction with nonce ${transaction.auth.spendingCondition.nonce}`);
				return; // already broadcast that transaction
			}
			if (additionalFeeMultiplier > 1)
				transaction.setFee(transaction.auth.spendingCondition.fee * additionalFeeMultiplier);
			broadcasts.push(broadcastTransaction(transaction, network));
			verboseLog(`Broadcasting ${transaction.txid()}`);
		});
		const broadcastResults = await Promise.all(broadcasts);
		console.log(broadcastResults);
	});
