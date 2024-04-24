import { Cl } from '@stacks/transactions';
import { beforeEach, describe, expect } from 'vitest';
import { createClientMockSetup } from './clients/mock-client';
import { sip10Tests } from './clients/sip10-client.ts';
const {
  goToNextCycle,
  goToNextRequestCycle,
  fundStrategy,
  requestMint,
  prepareTest,
  contracts,
  bot,
} = createClientMockSetup();
const mintDelay = 14;

describe('lisa token', () => {
  const accounts = simnet.getAccounts();
  const alice = accounts.get('wallet_1')!;
  const bob = accounts.get('wallet_2')!;

  beforeEach(() => {
    prepareTest().map(r => expect(r.result).toBeOk(Cl.bool(true)));
    let response = simnet.callPublicFn(contracts.endpoint, 'request-mint', [Cl.uint(100e6)], alice);
    expect(response.result).toBeOk(Cl.uint(1));
    goToNextRequestCycle();
    expect(fundStrategy(1e6).result).toBeOk(Cl.uint(1e6));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);
    response = simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot);
    expect(response.result).toBeOk(Cl.bool(true));
  });

  sip10Tests(contracts.lqstx);
});
