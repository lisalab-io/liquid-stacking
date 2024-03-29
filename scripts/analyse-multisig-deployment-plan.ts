
// SPDX-License-Identifier: BUSL-1.1

import {
	MultiSigSpendingCondition,
	PayloadType,
	StacksMessageType,
	deserializeTransaction,
} from "@stacks/transactions";
import { printUnifiedDiff } from 'print-diff';
import { assertSigner, deployPlan, readPlan } from "./utils.ts";
import { getStacksAddress, getStacksPubkeys, testnetAddressReplacements } from "./config.ts";
import { inspect } from "util";

const abortOnMissingDeploy = true;
const abortOnMismatchedDeploy = true;
const verboseTxPrint = false;

const address = getStacksAddress();
const pubkeys = getStacksPubkeys();

let errors = false;

readPlan()
	.then(plan => plan.map(tx => deserializeTransaction(tx)))
	.then(async (plan) => {
		console.log(`Plan contains ${plan.length} transactions`);
		const localPlan = await deployPlan(testnetAddressReplacements);
		plan.map(tx => {
			try {
				assertSigner(tx.auth.spendingCondition, address);
			}
			catch (error) {
				console.log(`Transaction with txid ${tx.txid()}, signer is invalid for currently set address`);
			}
			if (tx.payload.payloadType === PayloadType.SmartContract || tx.payload.payloadType === PayloadType.VersionedSmartContract) {
				const { contractName, codeBody } = tx.payload;
				const localDeploy = localPlan.find(item => item.contractName === contractName.content);
				if (localDeploy === undefined) {
					console.warn(`There is a contract deploy for '${contractName.content}' but there is no local version.`);
					if (abortOnMissingDeploy)
						printUnifiedDiff(codeBody.content, "");
					errors = true;
				}
				if (codeBody.content !== localDeploy?.codeBody) {
					console.warn(`Code body of contract deploy '${contractName.content}' does not match local version. Are you on the right commit?`);
					if (abortOnMismatchedDeploy)
						printUnifiedDiff(codeBody.content, localDeploy?.codeBody as string);
					errors = true;
				}
			}
			if (verboseTxPrint)
				console.log(inspect(tx, { showHidden: false, depth: null, colors: true }));
			const missingSigs = pubkeys.length - (tx.auth.spendingCondition as MultiSigSpendingCondition).fields.reduce((sum, field) => sum + (field.contents.type === StacksMessageType.MessageSignature ? 1 : 0), 0);
			console.log(missingSigs === 0 ? `Transaction ${tx.txid()} is fully signed` : `Transaction ${tx.txid()} needs ${missingSigs} signature(s)`);
		});
	}).then(() => {
		if (errors) {
			console.error("Errors were found in the plan.");
			process.exit(1);
		}
		console.log("Plan analysed successfully");
	});
