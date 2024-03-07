import { AddressHashMode, AddressVersion, addressFromPublicKeys, addressToString, compressPublicKey, pubKeyfromPrivKey } from "@stacks/transactions";
import { loadConfig } from "./config.ts";
import { bytesToHex } from '@stacks/common';

const config = loadConfig();

const pubkeys = config.secrets.map(sk => compressPublicKey(pubKeyfromPrivKey(sk).data));
const multisigAddress = addressFromPublicKeys(AddressVersion.MainnetMultiSig, AddressHashMode.SerializeP2WSH, pubkeys.length, pubkeys);
console.log(pubkeys.map(pk => bytesToHex(pk.data)));
console.log(addressToString(multisigAddress));
console.log(multisigAddress);