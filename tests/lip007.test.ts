// SPDX-License-Identifier: BUSL-1.1

import { Cl, ClarityType, principalCV, uintCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';
import {
  createClientMockSetup,
  oneMillionHoldingAfterRewards,
  reserve,
  treasuryHolding,
} from './clients/mock-client';

const { contracts, user, user2, prepareTest, executeLip } = createClientMockSetup();

const restHolding = 5500917909330;

const newHolder = 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.executor-dao';

describe(contracts.endpoint, () => {
  it('check balanaces with lip 007', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    let response = executeLip('SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B.lip005');
    const reserveAfterBurns = 7764857094940;

    response = simnet.callPublicFn(
      contracts.endpoint,
      'request-burn',
      [uintCV(reserve - reserveAfterBurns)],
      user
    );
    expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    response = executeLip('SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7.lip006');

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [principalCV(contracts.treasury)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(1329112009980));

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [principalCV(newHolder)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(0));

    // execute lip 007
    response = executeLip(`${simnet.deployer}.lip007`);

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [principalCV(contracts.treasury)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(1));

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [principalCV(newHolder)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(1329112009979));
  });
});
