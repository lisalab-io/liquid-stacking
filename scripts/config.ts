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