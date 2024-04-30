
// SPDX-License-Identifier: BUSL-1.1

import fs from "fs";
import { hexToBytes } from '@stacks/common';
import { AddressHashMode, TransactionVersion, addressFromHashMode, createStacksPrivateKey, publicKeyFromBytes } from "@stacks/transactions";
import { c32addressDecode } from 'c32check';
import type { StacksNetworkName } from "@stacks/network";

const secretsFile = "config.json";

export type Config = {
	secrets: string[],
	pubkeys: string[],
	address: string,
	network: StacksNetworkName
};

let cache: Config | null = null;

export const testnetAddressReplacements = {
	// zero address
	SP000000000000000000002Q6VF78: 'ST000000000000000000002AMW42H',
	// fastpool address
	SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
	// sip010 trait address
	SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
	// pool helper address
	SP001SFSMC2ZY76PD4M68P3WGX154XCH7NE3TYMX: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',

	// replace operators with clarinet testnet addresses
	SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
	SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5',
	SPSZ26REB731JN8H00TD010S600F4AB4Z8F0JRB7: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
	SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704: 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC',
	SP1ZPTDQ3801C1AYEZ37NJWNDZ3HM60HC2TCFP228: 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND',
	SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B: 'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB',
};

export const fundingTransactions = {};

export function loadConfig(): Config {
	if (cache !== null)
		return cache;
	const content = fs.readFileSync(secretsFile, "utf-8");
	let obj: Config | null = null;
	try {
		obj = JSON.parse(content);
	}
	catch (e) {
		throw new Error(`${secretsFile} is not valid JSON`);
	}
	if (typeof obj !== "object")
		throw new Error(`${secretsFile} config is not an object`);
	if (obj?.secrets.constructor !== Array)
		throw new Error(`${secretsFile} does not contain an array of secrets`);
	for (let secret of obj.secrets)
		if (typeof secret !== 'string' || (secret as string).length !== 33 * 2 || !(secret as string).endsWith('01'))
			throw new Error(`Invalid secret in ${secretsFile}, all secrets should be hex-encoded 33 bytes ending with 01`);
	cache = obj;
	return obj;
}

export function getStacksPrivateKeys() {
	const config = loadConfig();
	return config.secrets.map(secretHex => createStacksPrivateKey(secretHex));
}

export function getStacksPubkeys() {
	const config = loadConfig();
	return config.pubkeys.map(pubkeyHex => publicKeyFromBytes(hexToBytes(pubkeyHex)));
}

export function getStacksAddress() {
	const config = loadConfig();
	const [_, hash160] = c32addressDecode(config.address);
	return addressFromHashMode(AddressHashMode.SerializeP2WSH, getNetwork() === "mainnet" ? TransactionVersion.Mainnet : TransactionVersion.Testnet, hash160);
}

export function getNetwork() {
	const config = loadConfig();
	return config.network || "testnet";
}

export function isMainnet() {
	return getNetwork() === "mainnet";
}