import { AddressHashMode, AddressVersion, addressFromPublicKeys, addressToString, compressPublicKey, pubKeyfromPrivKey } from "@stacks/transactions";
import { getNetwork, getStacksPubkeys, loadConfig } from "./config.ts";
import { bytesToHex } from '@stacks/common';

const config = loadConfig();

const ownPubkeys = config.secrets.map(sk => compressPublicKey(pubKeyfromPrivKey(sk).data));
const network = getNetwork();
const version = network === "mainnet" ? AddressVersion.MainnetMultiSig : AddressVersion.TestnetMultiSig;

const allPubkeys = config.pubkeys && config.pubkeys.length ? getStacksPubkeys() : ownPubkeys;

const multisigAddress = addressFromPublicKeys(version, AddressHashMode.SerializeP2WSH, allPubkeys.length, allPubkeys);

console.log("Own pubkeys:")
console.log(ownPubkeys.map(pk => bytesToHex(pk.data)));

console.log("All pubkeys:");
console.log(allPubkeys.map(pk => bytesToHex(pk.data)));

console.log("Address from all pubkeys:")
console.log(addressToString(multisigAddress));
console.log(multisigAddress);