import { Cl } from '@stacks/transactions';
import { beforeEach, describe, expect } from 'vitest';
import { createClientMockSetup } from './clients/mock-client';
import { sip10Tests } from './clients/sip10-client.ts';
const { goToNextCycle, requestMint, prepareTest, contracts, bot } = createClientMockSetup();
const mintDelay = 14;

describe('lisa token', () => {
  beforeEach(() => {
    prepareTest().map(r => expect(r.result).toBeOk(Cl.bool(true)));
    requestMint(100e6);
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);
    simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot);
  });

  sip10Tests(contracts.lqstx);
});
