import { StacksMainnet } from '@stacks/network';
import {
  AnchorMode,
  PostConditionMode,
  type StacksTransaction,
  bufferCV,
  contractPrincipalCV,
  listCV,
  makeUnsignedContractCall,
  serializeCV,
  stringAsciiCV,
  tupleCV,
  uintCV,
  makeUnsignedContractDeploy,
  principalCV,
  boolCV,
} from '@stacks/transactions';
import { c32addressDecode } from 'c32check';
import { getAccountNonces, getNodeInfo } from 'ts-clarity';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// current beta api endpoint
const SIMULATION_API_ENDPOINT = 'https://api.stxer.xyz/simulations';

function runTx(tx: StacksTransaction) {
  // type 0: run transaction
  return tupleCV({ type: uintCV(0), data: bufferCV(tx.serialize()) });
}

function runEval(address: string, contractName: string, code: string) {
  // type 1: eval arbitrary code inside a contract
  return tupleCV({
    type: uintCV(1),
    data: bufferCV(
      serializeCV(
        tupleCV({
          contract: contractPrincipalCV(address, contractName),
          code: stringAsciiCV(code),
        })
      )
    ),
  });
}

async function main() {
  const info = await getNodeInfo();
  const block_height = info.stacks_tip_height;
  const block_hash = info.stacks_tip;
  console.log(`Running simulation on block ${block_height} 0x${block_hash}`);
  const address = 'SPSZ26REB731JN8H00TD010S600F4AB4Z8F0JRB7';
  const [, addressHash] = c32addressDecode(address);
  const nonces = await getAccountNonces(address);
  const nonce = nonces.last_executed_tx_nonce + 1;
  // const nonce = 1435;
  const common_params = {
    network: new StacksMainnet(),
    publicKey: '',
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    fee: 0,
  };

  const contractName = 'lip007';
  const codeBody = fs.readFileSync(
    path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      `../contracts/proposals/${contractName}.clar`
    ),
    'utf8'
  );
  const tx0 = await makeUnsignedContractDeploy({
    contractName,
    codeBody,
    nonce,
    ...common_params,
  });
  tx0.auth.spendingCondition.signer = addressHash;
  const votes: StacksTransaction[] = [];
  for (const voter of [
    'SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B',
    'SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704',
    'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7',
    'SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25',
  ]) {
    const nonces = await getAccountNonces(voter);
    const [, voterHash] = c32addressDecode(voter);
    const tx = await makeUnsignedContractCall(
      votes.length === 0
        ? {
            contractAddress: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH',
            contractName: 'operators',
            functionName: 'propose',
            functionArgs: [principalCV(`${address}.${contractName}`)],
            nonce: nonces.last_executed_tx_nonce + 1,
            ...common_params,
          }
        : {
            contractAddress: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH',
            contractName: 'operators',
            functionName: 'signal',
            functionArgs: [principalCV(`${address}.${contractName}`), boolCV(true)],
            nonce: nonces.last_executed_tx_nonce + 1,
            ...common_params,
          }
    );
    tx.auth.spendingCondition.signer = voterHash;
    votes.push(tx);
  }
  const req = tupleCV({
    block_height: uintCV(block_height),
    block_hash: bufferCV(
      Buffer.from(block_hash.startsWith('0x') ? block_hash.substring(2) : block_hash, 'hex')
    ),

    steps: listCV([
      // deploy proposal
      runTx(tx0),
      // check balances
      runEval(
        address,
        contractName,
        "(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx get-balance 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.treasury)"
      ),
      runEval(
        address,
        contractName,

        "(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx get-balance 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.executor-dao)"
      ),
      // vote and execute proposal
      ...votes.map(v => runTx(v)),
      // check balances again
      runEval(
        address,
        contractName,
        "(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx get-balance 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.treasury)"
      ),
      runEval(
        address,
        contractName,
        "(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx get-balance 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.executor-dao)"
      ),
    ]),
  });
  const body = serializeCV(req);
  const rs = await fetch(SIMULATION_API_ENDPOINT, {
    method: 'POST',
    body,
  }).then(rs => rs.json() as Promise<Record<string, unknown>>);
  console.log(`Simulation will be available at: https://stxer.xyz/simulations/${rs.id}`);
}

main().catch(console.error);
