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
import YAML from 'yaml';
import { getNetwork, getStacksAddress, getStacksPubkeys, isMainnet } from './config.ts';
import { assertSigner, planFile, verboseLog } from './utils.ts';

const manifestFile = './Clarinet.toml';
const simnetDeployFile = 'deployments/default.simnet-plan.yaml';
const lisaDaoContractName = 'lisa-dao';

const contractsToSkip = [
  "regtest-boot",
  "token-vesting",
  "simnet-boot",
  "extension-trait",
  "proposal-trait",
  "lisa-dao",
  "lqstx-mint-registry",
  "proxy-trait",
  "strategy-trait",
  "lqstx-vault",
  "stx-transfer-proxy",
  "token-lqstx",
  "token-vlqstx",
  "lqstx-mint-endpoint-v1-01",
  "operators",
  "fastpool-member1",
  "fastpool-member10",
  "fastpool-member2",
  "fastpool-member3",
  "fastpool-member4",
  "fastpool-member5",
  "fastpool-member6",
  "fastpool-member7",
  "fastpool-member8",
  "fastpool-member9",
  "xverse-member1",
  "xverse-member10",
  "xverse-member2",
  "xverse-member3",
  "xverse-member4",
  "xverse-member5",
  "xverse-member6",
  "xverse-member7",
  "xverse-member8",
  "xverse-member9",
  "public-pools-strategy",
  "public-pools-strategy-manager",
  "token-lisa",
  "boot",
  "commission-trait",
  "lisa-rebase",
  "lisa-transfer-proxy",
  "rebase-strategy-trait",
  "lqstx-mint-endpoint",
  "lqstx-transfer-proxy",
  "nft-trait",
  "rebase-1",
  "rebase-strategy-trait-v1-01",
  "sip-010-extensions-trait",
  "sip-010-trait",
  "sip-010-transferable-trait",
  "stx-transfer-many-proxy",
  "treasury",
];

const network = getNetwork();
const mainnetDeploy = isMainnet();
const address = getStacksAddress();
const pubKeys = getStacksPubkeys();
let nonce = -1; // set to -1 to fetch from network
const feeMultiplier = 1000; // transaction bytes * feeMultiplier
const feeAddition = 0; // add a flat amount on top
const feeCap = 7 * 1000000; // 7 STX

const testnetAddressReplacements = {
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

const fundingTransactions = {
  SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704: 10 * 1000000,
  SP1ZPTDQ3801C1AYEZ37NJWNDZ3HM60HC2TCFP228: 10 * 1000000,
  SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B: 10 * 1000000
};

const multisigSpendConditionByteLength = 66; // don't change

let tempTotalFee = 0n;
let includesBootContract = false;

type PlanItem = {
  contractName: string;
  codeBody: string;
  path: string;
  clarityVersion: number;
};

verboseLog(`Using address ${addressToString(address)}`);

function shouldDeployContract(contractPath: string) {
  // if (!isMainnet())
  // 	return true;
  return (
    !contractPath.startsWith('contracts_modules/') &&
    !contractPath.startsWith('./.cache/') &&
    !contractPath.startsWith('contracts/mocks/')
  );
}

function replaceMainnetToTestnetAddresses(codeBody: string) {
  for (const [find, replace] of Object.entries(testnetAddressReplacements))
    codeBody = codeBody.replace(new RegExp(find, 'g'), replace);
  return codeBody;
}

async function deployPlan(): Promise<PlanItem[]> {
  const simnet = await initSimnet(manifestFile);
  simnet.getContractsInterfaces(); // creates simnet deploy plan
  const simnetPlan = YAML.parse(fs.readFileSync(simnetDeployFile, 'utf-8'));
  const plan = simnetPlan.plan.batches
    .flatMap((batch: any) =>
      batch.transactions.map((transaction: any) => {
        const item = transaction['emulated-contract-publish'];
        if (shouldDeployContract(item.path as string)) {
          const codeBody = fs.readFileSync(item.path, 'utf-8');
          const deployCodeBody = mainnetDeploy
            ? codeBody
            : replaceMainnetToTestnetAddresses(codeBody);
          if (codeBody !== deployCodeBody) {
            verboseLog(`Made testnet address replacements in ${item['contract-name']}`);
          }
          return {
            contractName: item['contract-name'],
            codeBody: deployCodeBody,
            path: item.path,
            clarityVersion: item['clarity-version'],
          };
        }
        return null;
      })
    )
    .filter((item: any) => item !== null);
  return plan;
}

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
  verboseLog(`Created STX transfer to ${recipient} to the amount of ${amount}, calculated fee is ${calculatedFee}`);
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
    throw new Error(`Failed to read boot contract`);
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
  if (nonce !== -1)
    return;
  const addressString = addressToString(address);
  let currentNonce = 0n;
  try {
    currentNonce = await getNonce(addressString, network);
  }
  catch (error) {
    console.log('Failed to fetch current nonce - might happen on devnet');
    throw error;
  }
  verboseLog(`${addressString} account nonce is ${currentNonce}`);
  nonce = Number(currentNonce);
}

fetchNonce()
  .then(deployPlan)
  .then(plan =>
    plan.filter(item => {
      if (contractsToSkip.indexOf(item.contractName) !== -1) {
        verboseLog(
          `Skipping contract "${item.contractName}" because it is listed in contractsToSkip`
        );
        return false;
      }
      if (item.contractName === "boot")
        includesBootContract = true;
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
        BigInt(amount),
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
    }
    else {
      verboseLog('Skipping boot transaction because plan does not include boot contract');
    }
    return plan;
  })
  .then(plan => {
    fs.writeFileSync(planFile, JSON.stringify(plan), 'utf-8');
    verboseLog(`Last nonce is ${nonce}, total fee: ${Number(tempTotalFee) / 1000000} STX`);
    console.log(`Deploy plan written to ${planFile}, total of ${plan.length} transactions`);
  });
