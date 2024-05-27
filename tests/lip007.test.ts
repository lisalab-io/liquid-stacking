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
    // prepare
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
    expect(response.result).toHaveClarityType(ClarityType.ResponseOk);

    // check balances before
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
    expect(response.result).toHaveClarityType(ClarityType.ResponseOk);

    // check balances after
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

    const validOperators = [
      'SP1E0XBN9T4B10E9QMR7XMFJPMA19D77WY3KP2QKC',
      'SP1ESCTF9029MH550RKNE8R4D62G5HBY8PBBAF2N8',
      'SP1EF1PKR40XW37GDC0BP7SN4V4JCVSHSDVG71YTH',
      'SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704',
      'SP1ZPTDQ3801C1AYEZ37NJWNDZ3HM60HC2TCFP228',
      'SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B',
    ];
    const invalidOperators = [
      'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7',
      'SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25',
      'SPSZ26REB731JN8H00TD010S600F4AB4Z8F0JRB7',
    ];
    validOperators.map(operator => {
      expect(simnet.getMapEntry(contracts.operators, 'operators', principalCV(operator))).toBeSome(
        Cl.bool(true)
      );
    });

    invalidOperators.map(operator => {
      expect(simnet.getMapEntry(contracts.operators, 'operators', principalCV(operator))).toBeSome(
        Cl.bool(false)
      );
    });

    const validStrategyManagers = ['SPDQYG895XNB82F9T2NWRS48XBF3N137V1R5CFA3'];
    const invalidStrategyManagers = [
      'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7',
      'SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B',
    ];
    validStrategyManagers.map(operator => {
      expect(
        simnet.getMapEntry(contracts.manager, 'authorised-managers', principalCV(operator))
      ).toBeSome(Cl.bool(true));
    });

    invalidStrategyManagers.map(operator => {
      expect(
        simnet.getMapEntry(contracts.manager, 'authorised-managers', principalCV(operator))
      ).toBeSome(Cl.bool(false));
    });
  });
});
