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
import { getNetwork, getStacksAddress, getStacksPubkeys, isMainnet } from "./config.ts";
import { assertSigner, planFile, verboseLog } from "./utils.ts";

const manifestFile = "./Clarinet.toml";
const simnetDeployFile = "deployments/default.simnet-plan.yaml";
const lisaDaoContractName = "lisa-dao";

const contractsToSkip = [
	"regtest-boot",
	"token-vesting",
];

const network = getNetwork();
const mainnetDeploy = isMainnet();
const address = getStacksAddress();
const pubKeys = getStacksPubkeys();
let nonce = 0;
const feeMultiplier = 10000;
const feeCap = 0;//15 * 1000000; // 15 STX

const testnetAddressReplacements = {
	// zero address
	"SP000000000000000000002Q6VF78": "ST000000000000000000002AMW42H",
	// fastpool address
	"SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	// sip010 trait address
	"SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	// pool helper address
	"SP001SFSMC2ZY76PD4M68P3WGX154XCH7NE3TYMX": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",

	// replace operators with clarinet testnet addresses
	"SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
	"SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25": "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
	"SPSZ26REB731JN8H00TD010S600F4AB4Z8F0JRB7": "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
	"SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704": "ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC",
	"SP1ZPTDQ3801C1AYEZ37NJWNDZ3HM60HC2TCFP228": "ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND",
	"SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B": "ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB"
};

const multisigSpendConditionByteLength = 66; // don't change

let tempTotalFee = 0n;

type PlanItem = {
	contractName: string,
	codeBody: string,
	path: string,
	clarityVersion: number
};

verboseLog(`Using address ${addressToString(address)}`);

function shouldDeployContract(contractPath: string) {
	// if (!isMainnet())
	// 	return true;
	return !contractPath.startsWith("contracts_modules/") && !contractPath.startsWith("./.cache/") && !contractPath.startsWith("contracts/mocks/");
}

function replaceMainnetToTestnetAddresses(codeBody: string) {
	for (const [find, replace] of Object.entries(testnetAddressReplacements))
		codeBody = codeBody.replace(new RegExp(find, 'g'), replace);
	return codeBody;
}

async function deployPlan(): Promise<PlanItem[]> {
	const simnet = await initSimnet(manifestFile);
	simnet.getContractsInterfaces(); // creates simnet deploy plan
	const simnetPlan = YAML.parse(fs.readFileSync(simnetDeployFile, "utf-8"));
	const plan = simnetPlan.plan.batches.flatMap(
		(batch: any) => batch.transactions.map((transaction: any) => {
			const item = transaction['emulated-contract-publish'];
			if (shouldDeployContract(item.path as string)) {
				const codeBody = fs.readFileSync(item.path, 'utf-8');
				const deployCodeBody = mainnetDeploy ? codeBody : replaceMainnetToTestnetAddresses(codeBody);
				if (codeBody !== deployCodeBody) {
					verboseLog(`Made testnet address replacements in ${item['contract-name']}`);
				}
				return {
					contractName: item['contract-name'],
					codeBody: replaceMainnetToTestnetAddresses(deployCodeBody),
					path: item.path,
					clarityVersion: item['clarity-version']
				};
			}
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
	let calculatedFee = (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) * feeMultiplier;
	if (feeCap > 0 && calculatedFee > feeCap)
		calculatedFee = feeCap;
	tx.setFee(calculatedFee);
	verboseLog(`Created multisig contract deploy transaction for ${contractName}, calculated fee is ${calculatedFee}`);
	tempTotalFee += BigInt(calculatedFee);
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
	let calculatedFee = (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) * feeMultiplier;
	if (feeCap > 0 && calculatedFee > feeCap)
		calculatedFee = feeCap;
	tx.setFee(calculatedFee);
	tempTotalFee += BigInt(calculatedFee);
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
	let calculatedFee = (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) * feeMultiplier;
	if (feeCap > 0 && calculatedFee > feeCap)
		calculatedFee = feeCap;
	tx.setFee(calculatedFee);
	tempTotalFee += BigInt(calculatedFee);
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
	.then(plan => plan.filter(item => {
		if (contractsToSkip.indexOf(item.contractName) !== -1) {
			verboseLog(`Skipping contract "${item.contractName}" because it is listed in contractsToSkip`);
			return false;
		}
		return true;
	}))
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
		verboseLog(`Last nonce is ${nonce}, total fee: ${Number(tempTotalFee) / 1000000} STX`);
		console.log(`Deploy plan written to ${planFile}, total of ${plan.length} transactions`);
	});
