// SPDX-License-Identifier: BUSL-1.1

import { Cl, ClarityType, principalCV, stringAsciiCV, tupleCV, uintCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';
import {
  alexVaultHoldingShares,
  createClientMockSetup,
  factor,
  oneMillionHolding,
  oneMillionHoldingAfterRewards,
  reserve,
  treasuryHoldingShares,
} from './clients/mock-client';

const { contracts, user, user2, prepareTest, executeLip } = createClientMockSetup();

const restHolding = 5500917909330;
const tokensToShare1m = Math.floor(factor * oneMillionHolding); // for 1m STX = 995730662698

describe(contracts.endpoint, () => {
  it('check burn amount without lip 005', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expectTokensToShares(tokensToShare1m);
    console.log(tokensToShare1m);
    let response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
    // without lip005, all listx holder have 6.5m STX - 1m STX
    expect(response.result).toBeOk(Cl.uint(restHolding));

    response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user2)], user);
    expect(response.result).toBeOk(Cl.uint(oneMillionHoldingAfterRewards));
  });

  it('check burn amount with lip 005 and lip6', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expectTokensToShares(tokensToShare1m);

    let response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user)], user);
    // without lip005, all listx holder have 6.4m STX - 1m STX
    expect(response.result).toBeOk(Cl.uint(restHolding));
    //expect(response.result).toBeOk(Cl.uint(restLiSTXHolding - oneMillionHolding));

    response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user2)], user);
    expect(response.result).toBeOk(Cl.uint(oneMillionHoldingAfterRewards));

    response = executeLip('SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B.lip005');
    expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    console.log(response);
    // due to rounding errors we substract 1 uSTX here
    expect(response.events[1].data.amount).toBe(Number(alexVaultHoldingShares - 1).toString());
    expect(response.events[2].data.amount).toBe(Number(treasuryHoldingShares - 1).toString());

    //
    // execute mint/burn requests
    //

    // from https://explorer.hiro.so/txid/0x5a0fc63680c20f8c9003811f2970cdba6208e82c6f761bb17dd1a4df20ef6eb4?chain=mainnet
    const reserveAfterBurns = 7764857094940;
    const sharesAfterBurns = 7508585330100;

    response = simnet.callPublicFn(
      contracts.endpoint,
      'request-burn',
      [uintCV(reserve - reserveAfterBurns)],
      user
    );
    expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    expectRebaseEvent(response.events[4], {
      reserve: reserveAfterBurns,
      totalShare: sharesAfterBurns - 12, // 12 micro vLiSTX accepted as rounding differences
    });

    //
    // execute lip006
    //

    const tokensToMint = 230680068478; // from lip006;
    // shares to mint = 223066690982 from https://explorer.hiro.so/txid/0xcdf261e9610abf41a214599cbec90b37ec698f1b5014b822290d52e5c6bd0d3a?chain=mainnet
    const sharesToMint = Math.floor((tokensToMint * sharesAfterBurns) / reserveAfterBurns);

    response = executeLip('SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7.lip006');
    expect(response.result).toHaveClarityType(ClarityType.ResponseOk);
    expectRebaseEvent(response.events[2], {
      reserve: reserveAfterBurns,
      totalShare: sharesAfterBurns + sharesToMint - 12, // 7731652021070
    });
    expect(response.events[1].data.amount).toBe(Number(sharesToMint).toString());

    expectTokensToShares(tokensToShare1m - 6990449); // accepted as rounding difference
  });
});

function expectTokensToShares(tokensToShare1m: number) {
  let response = simnet.callReadOnlyFn(
    contracts.lqstx,
    'get-tokens-to-shares',
    [uintCV(1_000_000_000_000)],
    user
  );
  expect(response.result).toBeUint(tokensToShare1m);
}

function expectRebaseEvent(
  event: any,
  { reserve, totalShare }: { reserve: number; totalShare: number }
) {
  expect(event.data.value).toBeTuple({
    notification: stringAsciiCV('rebase'),
    payload: tupleCV({
      reserve: uintCV(reserve),
      'total-shares': uintCV(totalShare),
    }),
  });
}
