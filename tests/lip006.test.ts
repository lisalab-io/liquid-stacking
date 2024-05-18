// SPDX-License-Identifier: BUSL-1.1

import {
  BufferCV,
  Cl,
  ClarityType,
  ResponseOkCV,
  TupleCV,
  UIntCV,
  hexToCV,
  principalCV,
  responseOkCV,
} from '@stacks/transactions';
import fs from 'fs';
import { describe, expect, it } from 'vitest';
import { alexVaultHolding, createClientMockSetup, treasuryHolding } from './clients/mock-client';
import { tx } from '@hirosystems/clarinet-sdk';

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
  it('burn amount without lip 005', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    const response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [principalCV(user)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(6477432635309));
  });

  it('burn amount with lip 006 and lip 006', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    // check balance
    let response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
    console.log(response);
    expect(response.result).toBeOk(Cl.uint(6477432635309));

    //
    // execute lip 005
    //

    const result = executeLip('SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B.lip005');
    expect(result.events[1].data.amount).toBe(alexVaultHolding.toString());
    // due to rounding errors we substract 1 uSTX here
    expect(result.events[2].data.amount).toBe(Number(treasuryHolding - 1).toString()); // value from https://stxscan.co/transactions/0xeadfe530ae96a9b78468dc0b5707fa7a40796af9063695d52f3e2571e99b893e

    // check balance
    response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
    expect(response.result).toBeOk(Cl.uint(6669912442685));

    // execute mint/burn requests
    replayTxs();

    //
    // execute lip 006
    //

    response = executeLip(`${simnet.deployer}.lip006`);
    expect(response.result).toBeOk(Cl.bool(true));
    expect(response.events[1].data.amount).toBe('212368756023');

    // check balance
    response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
    expect(response.result).toBeOk(Cl.uint(6488082998329));
  });
});

function replayTxs() {
  const txList = JSON.parse(
    fs
      .readFileSync(
        './scripts/lip006/SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lqstx-mint-endpoint-v2-01_transactions.json'
      )
      .toString()
  );
  txList.filter((t: any) => t.tx.tx_status === 'success');
  txList.reverse();
  let sum = txList.reduce((t: any, sum: number) => {
    if (t.tx.contract_call.function_name === 'request-mint') {
      return sum + Number((hexToCV(t.tx.function_args[0].hex) as UIntCV).value);
    } else {
      return sum;
    }
  }, 0);
  console.log('mints', sum);

  sum = txList.reduce((t: any, sum: number) => {
    if (
      t.tx.contract_call.function_name === 'request-burn' &&
      (hexToCV(t.tx.tx_result.hex) as ResponseOkCV<TupleCV<{ status: BufferCV }>>).value.data.status
        .buffer[0] === 0
    ) {
      return sum + Number((hexToCV(t.tx.function_args[0].hex) as UIntCV).value);
    } else {
      return sum;
    }
  }, 0);
  console.log('burns-finalized', sum);

  sum = txList.reduce((t: any, sum: number) => {
    if (
      t.tx.contract_call.function_name === 'request-burn' &&
      (hexToCV(t.tx.tx_result.hex) as ResponseOkCV<TupleCV<{ status: BufferCV }>>).value.data.status
        .buffer[0] === 1
    ) {
      return sum + Number((hexToCV(t.tx.function_args[0].hex) as UIntCV).value);
    } else {
      return sum;
    }
  }, 0);
  console.log('burns-pending', sum);

  /*
  const response = simnet.mineBlock([
    txList.map((t: any) => {
      console.log(
        t.tx.block_height,
        t.tx.contract_call.function_name,
        t.tx.contract_call.function_args.map((arg: any) => hexToCV(arg.hex)),
        t.tx.events
      );

      return tx.callPublicFn(
        contracts.endpoint,
        t.tx.contract_call.function_name,
        t.tx.contract_call.function_args.map((arg: any) => hexToCV(arg.hex)),
        user
      );
    }),
  ]);
  console.log(response.length);
  response.map(r => expect(r.result).toHaveClarityType(ClarityType.ResponseOk));
  */
}
