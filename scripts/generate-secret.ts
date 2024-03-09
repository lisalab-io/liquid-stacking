import { makeRandomPrivKey } from "@stacks/transactions";
import { bytesToHex } from '@stacks/common';

const key = makeRandomPrivKey();
key.compressed = true;
key.data = new Uint8Array([...key.data, 1]);
console.log(key);
console.log(bytesToHex(key.data));

