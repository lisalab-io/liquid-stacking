// SPDX-License-Identifier: BUSL-1.1

import {
  BufferCV,
  Cl,
  ClarityType,
  ListCV,
  ResponseCV,
  ResponseOkCV,
  TupleCV,
  UIntCV,
  hexToCV,
  principalCV,
  uintCV,
} from '@stacks/transactions';
import fs from 'fs';
import { describe, expect, it } from 'vitest';
import {
  alexVaultHolding,
  createClientMockSetup,
  oneMillionHolding,
  restLiSTXHolding,
  treasuryHolding,
} from './clients/mock-client';

const {
  contracts,
  user,
  user2,
  oracle,
  bot,
  manager,
  prepareTest,
  goToNextCycle,
  goToNextRequestCycle,
  requestMint,
  requestBurn,
  fundStrategy,
  finalizeMint,
  executeLip,
} = createClientMockSetup();

// 1m STX
const mintAmount = 1_000_000e6;
const mintDelay = 432;

describe(contracts.endpoint, () => {
  it('check burn amount without lip 005', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    let response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
    // without lip005, all listx holder have 6.5m LiSTX - 1m LiSTX
    expect(response.result).toBeOk(Cl.uint(restLiSTXHolding - oneMillionHolding));

    response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user2)], user);
    expect(response.result).toBeOk(Cl.uint(oneMillionHolding));
  });

  it('check burn amount with lip 005 and lip 006 - simple amount', () => {
    checkBurnAmountWithLip005AndLip006('lip006-1', {
      amountAfterLip5: 1029715447186,
      amountExtraRewards: 5_70_377773,
      balanceOfRestHolder: 5219520234339,
      lossAlex: 5_745_804162,
    });
  });

  it('check burn amount with lip 005 and lip 006 - corrected amount', () => {
    checkBurnAmountWithLip005AndLip006('lip006-2', {
      amountAfterLip5: 1029715447186,
      amountExtraRewards: 93221,
      balanceOfRestHolder: 5216545319409,
      lossAlex: 2_091_960839,
    });
  });
});

function checkBurnAmountWithLip005AndLip006(
  lip006Name: string,
  {
    amountAfterLip5,
    // amounts after lip6
    amountExtraRewards,
    balanceOfRestHolder,
    lossAlex,
  }: {
    amountAfterLip5: number;
    amountExtraRewards: number;
    balanceOfRestHolder: number;
    lossAlex: number;
  }
) {
  prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  // check balance
  let response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
  console.log(response);
  expect(response.result).toBeOk(Cl.uint(restLiSTXHolding - oneMillionHolding));

  //
  // execute lip 005
  //

  const result = executeLip('SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B.lip005');
  expect(result.events[1].data.amount).toBe(alexVaultHolding.toString());
  // due to rounding errors we substract 1 uSTX here
  expect(result.events[2].data.amount).toBe(Number(treasuryHolding - 1).toString()); // value from https://stxscan.co/transactions/0xeadfe530ae96a9b78468dc0b5707fa7a40796af9063695d52f3e2571e99b893e

  // check balance for 1m holding user after lip 005
  response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user2)], user2);
  expect(response.result).toBeOk(Cl.uint(amountAfterLip5));

  // execute mint/burn requests
  replayTxs();

  //
  // execute lip 006
  //

  response = executeLip(`${simnet.deployer}.${lip006Name}`);
  expect(response.result).toBeOk(Cl.bool(true));
  // expect(response.events[1].data.amount).toBe('212368756023');

  // check balance of 1m holder
  response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user2)], user2);
  expect(response.result).toBeOk(Cl.uint(oneMillionHolding + amountExtraRewards));

  // check balance of all other LiSTX holders (some have left with the replay)
  response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
  expect(response.result).toBeOk(Cl.uint(balanceOfRestHolder));

  // check balance
  response = simnet.callReadOnlyFn(
    contracts.lqstx,
    'get-balance',
    [principalCV(contracts.treasury)],
    user2
  );
  expect(response.result).toBeOk(Cl.uint(alexVaultHolding - lossAlex));
}

function replayTxs() {
  let txList = JSON.parse(
    fs
      .readFileSync(
        './scripts/lip006/SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lqstx-mint-endpoint-v2-01_transactions.json'
      )
      .toString()
  );
  txList = txList.filter((t: any) => t.tx.tx_status === 'success');
  txList.reverse();
  let sum = txList.reduce((sum: number, t: any) => {
    if (t.tx.contract_call.function_name === 'request-mint') {
      return sum + Number((hexToCV(t.tx.contract_call.function_args[0].hex) as UIntCV).value);
    } else {
      return sum;
    }
  }, 0);
  console.log('mints', sum);

  sum = txList.reduce((sum: number, t: any) => {
    if (
      t.tx.contract_call.function_name === 'request-burn' &&
      (hexToCV(t.tx.tx_result.hex) as ResponseOkCV<TupleCV<{ status: BufferCV }>>).value.data.status
        .buffer[0] === 0
    ) {
      return sum + Number((hexToCV(t.tx.contract_call.function_args[0].hex) as UIntCV).value);
    } else {
      return sum;
    }
  }, 0);
  console.log('burns-finalized', sum);

  sum = txList.reduce((sum: number, t: any) => {
    if (
      t.tx.contract_call.function_name === 'request-burn' &&
      (hexToCV(t.tx.tx_result.hex) as ResponseOkCV<TupleCV<{ status: BufferCV }>>).value.data.status
        .buffer[0] === 1
    ) {
      return sum + Number((hexToCV(t.tx.contract_call.function_args[0].hex) as UIntCV).value);
    } else {
      return sum;
    }
  }, 0);
  console.log('burns-pending', sum);

  const stats: any = { finalizedMints: [], pendingBurns: {}, mint: {}, mintTotal: 0 };
  txList.forEach((t: any) => {
    let functionName = t.tx.contract_call.function_name;
    const arg0 = Number((hexToCV(t.tx.contract_call.function_args[0].hex) as UIntCV).value);
    switch (functionName) {
      case 'request-burn':
        const requestBurnResult = (
          hexToCV(t.tx.tx_result.hex) as ResponseOkCV<
            TupleCV<{ status: BufferCV; 'request-id': UIntCV }>
          >
        ).value.data;
        switch (requestBurnResult.status.buffer[0]) {
          case 0:
            stats.requestMintPending = arg0 + (stats.requestMintPending || 0);
            stats.pendingBurns[Number(requestBurnResult['request-id'].value).toString()] = arg0;
            break;
          case 1:
            stats.requestBurnFinalized = arg0 + (stats.requestBurnFinalized || 0);
            break;
          case 2:
            console.log(arg0);
            break;
          default:
            throw new Error('invalid status' + t.tx.tx_result.repr);
        }
        break;
      case 'revoke-mint':
        if (!isNaN(stats.mint[arg0.toString()])) {
          stats.mintTotal -= stats.mint[arg0.toString()];
        }
        stats.mint[arg0.toString()] = (stats.mint[arg0.toString()] || '') + 'revoked';
        break;
      case 'request-mint':
        const result = (hexToCV(t.tx.tx_result.hex) as ResponseOkCV<UIntCV>).value.value.toString();
        stats.mint[result] = arg0;
        stats.mintTotal += arg0;
        break;
      case 'finalize-mint-many':
        const results = (hexToCV(t.tx.tx_result.hex) as ResponseOkCV<ListCV<ResponseCV>>).value
          .list;
        const argList = (hexToCV(t.tx.contract_call.function_args[0].hex) as ListCV<UIntCV>).list;
        results.map((r: ResponseCV, index: number) => {
          if (r.type === ClarityType.ResponseOk) {
            stats.finalizedMints.push(argList[index].value);
          } else {
            // ignore
          }
        });
        break;
      case 'revoke-burn':
        stats.requestMintPending -= stats.pendingBurns[arg0.toString()];
        stats.pendingBurns[arg0.toString()] = stats.pendingBurns[arg0.toString()] + ' revoked';
        console.log(arg0);
        break;
      default:
        stats[functionName] = 'missing';
    }
  });

  console.log(stats);
  // burn listx as requested and finalized
  let response = simnet.callPublicFn(
    contracts.endpoint,
    'request-burn',
    [uintCV(stats.requestBurnFinalized)],
    user
  );
  console.log('request-burn', response);
  expect(response.result).toHaveClarityType(ClarityType.ResponseOk);

  // lock remaining stx
  response = fundStrategy(
    Number(
      simnet
        .getAssetsMap()
        .get('STX')
        ?.get('SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault') || 0
    )
  );
  console.log('fund-strategy', response);
  expect(response.result).toHaveClarityType(ClarityType.ResponseOk);

  // request to burn as requested and pending
  response = simnet.callPublicFn(
    contracts.endpoint,
    'request-burn',
    [uintCV(stats.requestMintPending)],
    user
  );
  expect(response.result).toHaveClarityType(ClarityType.ResponseOk);

  // request mints
  response = simnet.callPublicFn(
    contracts.endpoint,
    'request-mint',
    [uintCV(stats.mintTotal)],
    user
  );
  console.log('mint-request', response);
  expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
}
