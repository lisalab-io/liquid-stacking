// SPDX-License-Identifier: BUSL-1.1

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
  makeUnsignedSTXTokenTransfer,
  getNonce,
} from '@stacks/transactions';
import type { StacksNetworkName } from '@stacks/network';
import { initSimnet } from '@hirosystems/clarinet-sdk';
import fs from 'fs';
import { bytesToHex } from '@stacks/common';
import {
  fundingTransactions,
  getNetwork,
  getStacksAddress,
  getStacksPubkeys,
  testnetAddressReplacements,
} from './config.ts';
import { assertSigner, planFile, verboseLog, manifestFile, deployPlan } from './utils.ts';

const lisaDaoContractName = 'lisa-dao';

const contractsToSkip = [
  'regtest-boot',
  'token-vesting',
  'simnet-boot',
  'extension-trait',
  'proposal-trait',
  'lisa-dao',
  'lqstx-mint-registry',
  'proxy-trait',
  'strategy-trait',
  'lqstx-vault',
  'stx-transfer-proxy',
  'token-lqstx',
  'token-vlqstx',
  'lqstx-mint-endpoint-v1-01',
  'operators',
  'fastpool-member1',
  'fastpool-member10',
  'fastpool-member2',
  'fastpool-member3',
  'fastpool-member4',
  'fastpool-member5',
  'fastpool-member6',
  'fastpool-member7',
  'fastpool-member8',
  'fastpool-member9',
  'xverse-member1',
  'xverse-member10',
  'xverse-member2',
  'xverse-member3',
  'xverse-member4',
  'xverse-member5',
  'xverse-member6',
  'xverse-member7',
  'xverse-member8',
  'xverse-member9',
  'public-pools-strategy',
  'public-pools-strategy-manager',
  'token-lisa',
  'boot',
  'commission-trait',
  'lisa-rebase',
  'lisa-transfer-proxy',
  'rebase-strategy-trait',
  'lqstx-mint-endpoint',
  'lqstx-transfer-proxy',
  'nft-trait',
  'rebase-1',
  'rebase-strategy-trait-v1-01',
  'sip-010-extensions-trait',
  'sip-010-trait',
  'sip-010-transferable-trait',
  'stx-transfer-many-proxy',
  'treasury',
  'li-stx-burn-nft',
  'li-stx-mint-nft',
  'lqstx-mint-endpoint-v1-02',
  'endpoint-whitelist-helper-v1-02',
  'lip001',
  'lip002',
];

const network = getNetwork();
const address = getStacksAddress();
const pubKeys = getStacksPubkeys();
let nonce = -1; // set to -1 to fetch from network
const feeMultiplier = 1000; // transaction bytes * feeMultiplier
const feeAddition = 0; // add a flat amount on top
const feeCap = 7 * 1000000; // 7 STX

const multisigSpendConditionByteLength = 66; // don't change

let tempTotalFee = 0n;
let includesBootContract = false;

verboseLog(`Using address ${addressToString(address)}`);

// adding fields on the unsigned tx makes it easier to manage
function addPubkeyFields(tx: StacksTransaction, pubKeys: StacksPublicKey[]) {
  for (const pk of pubKeys) tx.appendPubkey(pk);
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
  checkSigner: Address
): Promise<StacksTransaction> {
  const publicKeys = pubkeys.map(pk => bytesToHex(pk.data));
  const tx = await makeUnsignedContractDeploy({
    numSignatures,
    publicKeys,
    contractName,
    codeBody,
    network,
    nonce,
    fee: 1,
    anchorMode: AnchorMode.OnChainOnly,
  });
  // makeUnsignedContractDeploy() forces a AddressHashMode.SerializeP2SH spending condition, so we construct it manually
  // and replace it.
  tx.auth.spendingCondition = createMultiSigSpendingCondition(
    AddressHashMode.SerializeP2WSH,
    numSignatures,
    publicKeys,
    nonce,
    1
  );
  assertSigner(tx.auth.spendingCondition, checkSigner);
  let calculatedFee =
    (tx.serialize().byteLength + multisigSpendConditionByteLength * pubKeys.length) *
      feeMultiplier +
    feeAddition;
  if (feeCap > 0 && calculatedFee > feeCap) calculatedFee = feeCap;
  tx.setFee(calculatedFee);
  verboseLog(
    `Created multisig contract deploy transaction for ${contractName}, calculated fee is ${calculatedFee}`
  );
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
  verboseLog(
    `Created STX transfer to ${recipient} to the amount of ${amount}, calculated fee is ${calculatedFee}`
  );
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
  stxSpenderAddress: string
): Promise<StacksTransaction> {
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
    postConditions:
      stxSpendAmount <= 0
        ? []
        : [createSTXPostCondition(stxSpenderAddress, FungibleConditionCode.Equal, stxSpendAmount)],
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
  verboseLog(`Created boot transaction, calculated fee is ${calculatedFee}`);
  return tx;
}

async function findStxBootstrapAmount() {
  const simnet = await initSimnet(manifestFile);
  let boot: any = null;
  try {
    boot = simnet.getContractAST('boot');
  } catch (error) {
    //throw new Error(`Failed to read boot contract`);
    return null;
  }
  return findStxBootstrapAmountAtom(boot.expressions);
}

function findStxBootstrapAmountAtom(items: any[]): bigint | null {
  for (let i = 0; i < items.length; ++i) {
    const item = items[i];
    if (item.expr?.List?.length === 3) {
      let [a, b, c] = item.expr.List;
      if (a.expr?.Atom === 'define-constant' && b.expr?.Atom === 'stx-bootstrap-amount')
        return c.expr.LiteralValue.UInt;
    } else if (item.expr?.List) {
      const result: any = findStxBootstrapAmountAtom(item.expr.List);
      if (result !== null) return result;
    }
  }
  return null;
}

async function fetchNonce() {
  if (nonce !== -1) return;
  const addressString = addressToString(address);
  let currentNonce = 0n;
  try {
    currentNonce = await getNonce(addressString, network);
  } catch (error) {
    console.log('Failed to fetch current nonce - might happen on devnet');
    throw error;
  }
  verboseLog(`${addressString} account nonce is ${currentNonce}`);
  nonce = Number(currentNonce);
}

fetchNonce()
  .then(() => deployPlan(testnetAddressReplacements))
  .then(plan =>
    plan.filter(item => {
      if (contractsToSkip.indexOf(item.contractName) !== -1) {
        verboseLog(
          `Skipping contract "${item.contractName}" because it is listed in contractsToSkip`
        );
        return false;
      }
      if (item.contractName === 'boot') includesBootContract = true;
      return true;
    })
  )
  .then(plan =>
    Promise.all(
      plan.map(item =>
        createMultisigDeployTransaction(
          item.contractName,
          item.codeBody,
          feeMultiplier,
          nonce++,
          pubKeys.length,
          pubKeys,
          network,
          address
        )
      )
    )
  )
  .then(plan =>
    plan.map(transaction => bytesToHex(addPubkeyFields(transaction, pubKeys).serialize()))
  )
  .then(async plan => {
    const addressString = addressToString(address);

    const bootstrapStxAmount = await findStxBootstrapAmount();
    if (bootstrapStxAmount !== null) {
      verboseLog(
        `Boot contract STX bootstrap amount is ${bootstrapStxAmount}, creating funding transaction`
      );

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

    for (const [recipient, amount] of Object.entries(fundingTransactions)) {
      const fundingTx = await createMultisigStxTransaction(
        BigInt(amount as number),
        recipient,
        feeMultiplier,
        nonce++,
        pubKeys.length,
        pubKeys,
        address
      );
      plan.push(bytesToHex(addPubkeyFields(fundingTx, pubKeys).serialize()));
    }

    if (includesBootContract) {
      const bootTx = await createMultisigBootTransaction(
        addressString,
        lisaDaoContractName,
        'construct',
        [contractPrincipalCV(addressString, 'boot')],
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
    } else {
      verboseLog('Skipping boot transaction because plan does not include boot contract');
    }
    return plan;
  })
  .then(plan => {
    fs.writeFileSync(planFile, JSON.stringify(plan), 'utf-8');
    verboseLog(`Last nonce is ${nonce}, total fee: ${Number(tempTotalFee) / 1000000} STX`);
    console.log(`Deploy plan written to ${planFile}, total of ${plan.length} transactions`);
  });
