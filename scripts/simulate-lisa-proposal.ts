import { StacksMainnet } from "@stacks/network";
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
  trueCV,
  uintCV,
  makeUnsignedContractDeploy,
  principalCV,
  noneCV,
} from "@stacks/transactions";
import { c32addressDecode } from "c32check";
import { getAccountNonces, getNodeInfo } from "ts-clarity";
import fs from "node:fs";
import path from "node:path";

// current beta api endpoint
const SIMULATION_API_ENDPOINT = "https://api.stxer.xyz/simulations";

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
  const deployer = "SP673Z4BPB4R73359K9HE55F2X91V5BJTN5SXZ5T";
  const address = deployer;
  const [, addressHash] = c32addressDecode(address);
  const nonces = await getAccountNonces(address);
  let nonce = nonces.last_executed_tx_nonce + 1;

  const common_params = {
    network: "mainnet",
    publicKey: "",
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
    fee: 0,
  };

  const _contracts = {
    'auto-alex-v3-endpoint-v2': 'extensions/auto-alex-v3-endpoint-v2',
    'lip011': 'proposals/lip011'
  };
  const _deploy = Object.keys(_contracts).slice(0);
  const _propose = Object.keys(_contracts).slice(1);

  const deployTx: StacksTransaction[] = [];
  for (let i = 0; i < _deploy.length; i++) {
    const tx = await makeUnsignedContractDeploy({
      contractName: _deploy[i],
      codeBody: fs.readFileSync(
        path.resolve(__dirname, `../contracts/${_contracts[_deploy[i]]}.clar`),
        "utf8"
      ),
      nonce: nonce++,
      ...common_params,
    });
    tx.auth.spendingCondition.signer = addressHash;
    deployTx.push(tx);
  }

  let proposerNonce = (await getAccountNonces("SP1E0XBN9T4B10E9QMR7XMFJPMA19D77WY3KP2QKC")).last_executed_tx_nonce + 1;
  const [, proposerHash] = c32addressDecode("SP1E0XBN9T4B10E9QMR7XMFJPMA19D77WY3KP2QKC");
  const proposeTx: StacksTransaction[] = [];
  for (let i = 0; i < _propose.length; i++) {
    const tx = await makeUnsignedContractCall({
      contractAddress: "SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH",
      contractName: "operators",
      functionName: "propose",
      functionArgs: [principalCV(`${address}.${_propose[i]}`)],
      nonce: proposerNonce++,
      ...common_params
    });
    tx.auth.spendingCondition.signer = proposerHash;
    proposeTx.push(tx);
  }   

  const votes: StacksTransaction[] = [];
  for (let i = 0; i < _propose.length; i++) {
    for (const voter of [
      "SP1ESCTF9029MH550RKNE8R4D62G5HBY8PBBAF2N8",
      "SP1EF1PKR40XW37GDC0BP7SN4V4JCVSHSDVG71YTH",
      "SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704",
    ]) {
      const nonces = await getAccountNonces(voter);
      const [, voterHash] = c32addressDecode(voter);
      const tx = await makeUnsignedContractCall({
        contractAddress: "SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH",
        contractName: "operators",
        functionName: "signal",
        functionArgs: [principalCV(`${address}.${_propose[i]}`), trueCV()],
        nonce: nonces.last_executed_tx_nonce + 1 + i,
        ...common_params,
      });
      tx.auth.spendingCondition.signer = voterHash;
      votes.push(tx);
    }
  }

  // let userNonce = (await getAccountNonces("SP382ZZ89G7GFDX5SN781VBFCYSR3KW8Y9MQ0MF5X")).last_executed_tx_nonce + 1;
  // const [, userHash] = c32addressDecode("SP382ZZ89G7GFDX5SN781VBFCYSR3KW8Y9MQ0MF5X");
  // const userTx = await makeUnsignedContractCall({
  //   contractAddress: deployer,
  //   contractName: "auto-alex-v3-endpoint",
  //   functionName: "revoke-redeem",
  //   functionArgs: [
  //     uintCV(8)
  //   ],
  //   nonce: userNonce++,
  //   ...common_params
  // });
  // userTx.auth.spendingCondition.signer = userHash;

  const req = tupleCV({
    block_height: uintCV(block_height),
    block_hash: bufferCV(
      Buffer.from(
        block_hash.startsWith("0x") ? block_hash.substring(2) : block_hash,
        "hex"
      )
    ),
    steps: listCV([
      ...deployTx.map((v) => runTx(v)),
      ...proposeTx.map((v) => runTx(v)),
      ...votes.map((v) => runTx(v)),
      // runTx(userTx),
      // runEval(
      //   address,
      //   "alex-staking-v2",
      //   `(contract-call? '${deployer}.claim-recovered get-claim-or-default 'SPFP4YRN8XZCZ34YKB9NJT5NCZCE5ST5AVGJMH7B)`
      // ),    
    ]),
  });
  const body = serializeCV(req);
  const rs = await fetch(SIMULATION_API_ENDPOINT, {
    method: "POST",
    body,
  }).then((rs) => rs.json() as Promise<Record<string, unknown>>);
  console.log(
    `Simulation will be available at: https://stxer.xyz/simulations/mainnet/${rs.id}`
  );
}

main().catch(console.error);
