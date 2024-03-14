
// SPDX-License-Identifier: BUSL-1.1

import {
	MultiSigSpendingCondition,
	StacksMessageType,
	deserializeTransaction,
} from "@stacks/transactions";
import { assertSigner, readPlan } from "./utils.ts";
import { getStacksAddress, getStacksPubkeys } from "./config.ts";
import { inspect } from "util";

const address = getStacksAddress();
const pubkeys = getStacksPubkeys();

readPlan()
	.then(plan => plan.map(tx => deserializeTransaction(tx)))
	.then(plan => {
		console.log(`Plan contains ${plan.length} transactions`);
		plan.map(tx => {
			try {
				assertSigner(tx.auth.spendingCondition, address);
			}
			catch (error) {
				console.log(`Transaction with txid ${tx.txid()}, signer is invalid for currently set address`);
			}
			console.log(inspect(tx, { showHidden: false, depth: null, colors: true }));
			const missingSigs = pubkeys.length - (tx.auth.spendingCondition as MultiSigSpendingCondition).fields.reduce((sum, field) => sum + (field.contents.type === StacksMessageType.MessageSignature ? 1 : 0), 0);
			console.log(missingSigs === 0 ? 'Transaction is fully signed' : `Transaction needs ${missingSigs} signature(s)`);
		});
	});
