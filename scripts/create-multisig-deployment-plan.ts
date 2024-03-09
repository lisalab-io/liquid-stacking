import {
	makeUnsignedContractDeploy,
	StacksPublicKey,
	StacksTransaction,
	AnchorMode,
	AddressHashMode,
	createMultiSigSpendingCondition,
	addressToString,
	Address,
	makeUnsignedContractCall,
	PostConditionMode,
	createSTXPostCondition,
	FungibleConditionCode,
	ClarityValue,
	contractPrincipalCV,
	makeUnsignedSTXTokenTransfer
} from "@stacks/transactions";
import type { StacksNetworkName } from "@stacks/network";
import { initSimnet } from "@hirosystems/clarinet-sdk";
import fs from "fs";
import { bytesToHex } from '@stacks/common';
import YAML from "yaml";
import { getNetwork, getStacksAddress, getStacksPubkeys } from "./config.ts";
import { assertSigner, planFile, verboseLog } from "./utils.ts";

const manifestFile = "./Clarinet.toml";
const simnetDeployFile = "deployments/default.simnet-plan.yaml";
const lisaDaoContractName = "lisa-dao";

const network = getNetwork();
const address = getStacksAddress();
const pubKeys = getStacksPubkeys();
let nonce = 0;
const feeMultiplier = 1;

const multisigSpendConditionByteLength = 66; // don't change

type PlanItem = {
	contractName: string,
	codeBody: string,
	path: string,
	clarityVersion: number
};

verboseLog(`Using address ${addressToString(address)}`);

async function deployPlan(): Promise<PlanItem[]> {
	const simnet = await initSimnet(manifestFile);
	simnet.getContractsInterfaces(); // creates simnet deploy plan
	const simnetPlan = YAML.parse(fs.readFileSync(simnetDeployFile, "utf-8"));
	const plan = simnetPlan.plan.batches.flatMap(
		(batch: any) => batch.transactions.map((transaction: any) => {
			const item = transaction['emulated-contract-publish'];
			if (!(item.path as string).startsWith("contracts_modules/") && !(item.path as string).startsWith("./.cache/") && !(item.path as string).startsWith("contracts/mocks/"))
				return {
					contractName: item['contract-name'],
					codeBody: fs.readFileSync(item.path, 'utf-8'),
					path: item.path,
					clarityVersion: item['clarity-version']
				};
			return null;
		})
	).filter((item: any) => item !== null);
	return plan;
}

// adding fields on the unsigned tx makes it easier to manage
function addPubkeyFields(tx: StacksTransaction, pubKeys: StacksPublicKey[]) {
	for (const pk of pubKeys)
		tx.appendPubkey(pk);
	return tx;
}

async function createMultisigDeployTransaction(
	contractName: string,
	codeBody: string,
	feeMultiplier: number,
	nonce: number,
	numSignatures: number,
	pubkeys: StacksPublicKey[],
	network: StacksNetworkName,
	checkSigner: Address): Promise<StacksTransaction> {
	const publicKeys = pubkeys.map(pk => bytesToHex(pk.data));
	const tx = await makeUnsignedContractDeploy({
		numSignatures,
		publicKeys,
		contractName,
		codeBody,
		network,
		nonce,
		fee: 1,
		anchorMode: AnchorMode.OnChainOnly
	});
	// makeUnsignedContractDeploy() forces a AddressHashMode.SerializeP2SH spending condition, so we construct it manually
	// and replace it.
	tx.auth.spendingCondition = createMultiSigSpendingCondition(AddressHashMode.SerializeP2WSH, numSignatures, publicKeys, nonce, 1);
	assertSigner(tx.auth.spendingCondition, checkSigner);
	const calculatedFee = (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) * feeMultiplier;
	tx.setFee(calculatedFee);
	verboseLog(`Created multisig contract deploy transaction for ${contractName}`);
	return tx;
}

async function createMultisigStxTransaction(
	amount: bigint,
	recipient: string,
	feeMultiplier: number,
	nonce: number,
	numSignatures: number,
	pubkeys: StacksPublicKey[],
	signer: Address) {
	const publicKeys = pubkeys.map(pk => bytesToHex(pk.data));
	const tx = await makeUnsignedSTXTokenTransfer({
		numSignatures,
		publicKeys,
		recipient,
		fee: 1,
		nonce,
		network,
		amount,
		anchorMode: AnchorMode.OnChainOnly
	});
	// makeUnsignedContractCall() forces a AddressHashMode.SerializeP2SH spending condition, so we construct it manually
	// and replace it.
	tx.auth.spendingCondition = createMultiSigSpendingCondition(AddressHashMode.SerializeP2WSH, numSignatures, publicKeys, nonce, 1);
	assertSigner(tx.auth.spendingCondition, signer);
	const calculatedFee = (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) * feeMultiplier;
	tx.setFee(calculatedFee);
	return tx;
}

async function createMultisigBootTransaction(
	contractAddress: string,
	contractName: string,
	functionName: string,
	functionArgs: ClarityValue[],
	feeMultiplier: number,
	nonce: number,
	numSignatures: number,
	pubkeys: StacksPublicKey[],
	network: StacksNetworkName,
	signer: Address,
	stxSpendAmount: bigint,
	stxSpenderAddress: string): Promise<StacksTransaction> {
	const publicKeys = pubkeys.map(pk => bytesToHex(pk.data));
	const tx = await makeUnsignedContractCall({
		numSignatures,
		publicKeys,
		contractAddress,
		contractName,
		functionName,
		functionArgs,
		network,
		nonce,
		fee: 1,
		anchorMode: AnchorMode.OnChainOnly,
		postConditionMode: PostConditionMode.Deny,
		postConditions: stxSpendAmount <= 0 ? [] : [createSTXPostCondition(stxSpenderAddress, FungibleConditionCode.Equal, stxSpendAmount)]
	});
	// makeUnsignedContractCall() forces a AddressHashMode.SerializeP2SH spending condition, so we construct it manually
	// and replace it.
	tx.auth.spendingCondition = createMultiSigSpendingCondition(AddressHashMode.SerializeP2WSH, numSignatures, publicKeys, nonce, 1);
	assertSigner(tx.auth.spendingCondition, signer);
	const calculatedFee = (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) * feeMultiplier;
	tx.setFee(calculatedFee);
	verboseLog(`Created boot transaction`);
	return tx;
}

async function findStxBootstrapAmount() {
	const simnet = await initSimnet(manifestFile);
	let boot: any = null;
	try {
		boot = simnet.getContractAST('boot');
	}
	catch (error) {
		throw new Error(`Failed to read boot contract`);
	}
	return findStxBootstrapAmountAtom(boot.expressions);
}

function findStxBootstrapAmountAtom(items: any[]): bigint | null {
	for (let i = 0; i < items.length; ++i) {
		const item = items[i];
		if (item.expr?.List?.length === 3) {
			let [a, b, c] = item.expr.List;
			if (a.expr?.Atom === "define-constant" && b.expr?.Atom === "stx-bootstrap-amount")
				return c.expr.LiteralValue.UInt;
		}
		else if (item.expr?.List) {
			const result: any = findStxBootstrapAmountAtom(item.expr.List);
			if (result !== null)
				return result;
		}
	}
	return null;
}

deployPlan()
	.then(plan => Promise.all(plan.map(item => createMultisigDeployTransaction(item.contractName, item.codeBody, feeMultiplier, nonce++, pubKeys.length, pubKeys, network, address))))
	.then(plan => plan.map(transaction => bytesToHex(addPubkeyFields(transaction, pubKeys).serialize())))
	.then(async (plan) => {
		const addressString = addressToString(address);

		const bootstrapStxAmount = await findStxBootstrapAmount();
		if (bootstrapStxAmount !== null) {
			verboseLog(`Boot contract STX bootstrap amount is ${bootstrapStxAmount}, creating funding transaction`);

			const fundingTx = await createMultisigStxTransaction(
				bootstrapStxAmount,
				`${addressString}.${lisaDaoContractName}`,
				feeMultiplier,
				nonce++,
				pubKeys.length,
				pubKeys,
				address
			);
			plan.push(bytesToHex(addPubkeyFields(fundingTx, pubKeys).serialize()));
		}

		const bootTx = await createMultisigBootTransaction(
			addressString,
			lisaDaoContractName,
			"construct",
			[contractPrincipalCV(addressString, "boot")],
			feeMultiplier,
			nonce++,
			pubKeys.length,
			pubKeys,
			network,
			address,
			bootstrapStxAmount ?? 0n,
			`${addressString}.${lisaDaoContractName}`
		);

		plan.push(bytesToHex(addPubkeyFields(bootTx, pubKeys).serialize()));
		return plan;
	})
	.then(plan => {
		fs.writeFileSync(planFile, JSON.stringify(plan), "utf-8");
		verboseLog(`Last nonce is ${nonce}`);
		console.log(`Deploy plan written to ${planFile}, total of ${plan.length} transactions`);
	});
