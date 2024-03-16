// SPDX-License-Identifier: BUSL-1.1

import { bytesToHex } from '@stacks/common';
import {
  Address,
  AddressHashMode,
  AnchorMode,
  StacksPublicKey,
  StacksTransaction,
  addressToString,
  createMultiSigSpendingCondition,
  makeUnsignedSTXTokenTransfer,
} from '@stacks/transactions';
import fs from 'fs';
import { getNetwork, getStacksAddress, getStacksPubkeys } from './config.ts';
import { assertSigner, planFile, verboseLog } from './utils.ts';

const lisaDaoContractName = 'lisa-dao';

const network = getNetwork();
const address = getStacksAddress();
const pubKeys = getStacksPubkeys();
let nonce = 27;
const feeMultiplier = 100; // transaction bytes * feeMultiplier
const feeAddition = 1; // add a flat amount on top
const feeCap = 0; //15 * 1000000; // 15 STX

const multisigSpendConditionByteLength = 66; // don't change

let tempTotalFee = 0n;

verboseLog(`Using address ${addressToString(address)}`);

async function createMultisigStxTransaction(
  amount: bigint,
  recipient: string,
  feeMultiplier: number,
  nonce: number,
  numSignatures: number,
  pubkeys: StacksPublicKey[],
  signer: Address
) {
  const publicKeys = pubkeys.map(pk => bytesToHex(pk.data));
  const tx = await makeUnsignedSTXTokenTransfer({
    numSignatures,
    publicKeys,
    recipient,
    fee: 1,
    nonce,
    network,
    amount,
    anchorMode: AnchorMode.OnChainOnly,
  });
  // makeUnsignedContractCall() forces a AddressHashMode.SerializeP2SH spending condition, so we construct it manually
  // and replace it.
  tx.auth.spendingCondition = createMultiSigSpendingCondition(
    AddressHashMode.SerializeP2WSH,
    numSignatures,
    publicKeys,
    nonce,
    1
  );
  assertSigner(tx.auth.spendingCondition, signer);
  let calculatedFee =
    (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) *
      feeMultiplier +
    feeAddition;
  if (feeCap > 0 && calculatedFee > feeCap) calculatedFee = feeCap;
  tx.setFee(calculatedFee);
  tempTotalFee += BigInt(calculatedFee);
  return tx;
}

// adding fields on the unsigned tx makes it easier to manage
function addPubkeyFields(tx: StacksTransaction, pubKeys: StacksPublicKey[]) {
  for (const pk of pubKeys) tx.appendPubkey(pk);
  return tx;
}

const addressString = addressToString(address);

(async () => {
  const fundingTx = await createMultisigStxTransaction(
    394399976n - 52501n,
    `${addressString}.${lisaDaoContractName}`,
    feeMultiplier,
    nonce++,
    pubKeys.length,
    pubKeys,
    address
  );
  return [bytesToHex(addPubkeyFields(fundingTx, pubKeys).serialize())];
})().then(plan => {
  fs.writeFileSync(planFile, JSON.stringify(plan), 'utf-8');
  verboseLog(`Last nonce is ${nonce}, total fee: ${Number(tempTotalFee) / 1000000} STX`);
  console.log(`Deploy plan written to ${planFile}, total of ${plan.length} transactions`);
});
