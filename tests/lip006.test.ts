// SPDX-License-Identifier: BUSL-1.1

import { tx } from '@hirosystems/clarinet-sdk';
import { Cl, TupleCV, UIntCV, uintCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';
import { alexVaultHolding, createClientMockSetup, treasuryHolding } from './clients/mock-client';
import { cvToString } from '@stacks/transactions';

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

    const response = simnet.callPublicFn(
      contracts.endpoint,
      'request-burn',
      [uintCV(1000e6)],
      user
    );
    console.log(response);
    expect(response.result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('01') })
    );
  });

  it('burn amount with lip 006 and lip 006', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    const result = executeLip('SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B.lip005');
    expect(result.events[1].data.amount).toBe(alexVaultHolding.toString());
    // due to rounding errors we substract 1 uSTX here
    expect(result.events[2].data.amount).toBe(Number(treasuryHolding - 1).toString()); // value from https://stxscan.co/transactions/0xeadfe530ae96a9b78468dc0b5707fa7a40796af9063695d52f3e2571e99b893e

    console.log(simnet.getAssetsMap());

    const response = executeLip(`${simnet.deployer}.lip006`);
    console.log(response);
  });
});
