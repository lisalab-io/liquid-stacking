// SPDX-License-Identifier: BUSL-1.1

import { tx } from '@hirosystems/clarinet-sdk';
import { Cl, ResponseOkCV, TupleCV, UIntCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';

const accounts = simnet.getAccounts();
const user = accounts.get('wallet_1')!;
const oracle = accounts.get('wallet_2')!;
const bot = accounts.get('wallet_3')!;
const manager = accounts.get('wallet_4')!;

const contracts = {
  endpoint: 'lqstx-mint-endpoint-v1-02',
  registry: 'lqstx-mint-registry',
  vault: 'lqstx-vault',
  lqstx: 'token-lqstx',
  vlqstx: 'token-vlqstx',
  wstx: 'token-wstx',
  strategy: 'mock-strategy',
  rebase: 'lisa-rebase-v1-02',
  rebase1: 'rebase-mock',
  amm: 'amm-swap-pool-v1-1',
  wlqstx: 'token-wlqstx',
  dao: 'lisa-dao',
  boot: 'regtest-boot',
  manager: 'mock-strategy-manager',
  operators: 'operators',
  proposal: 'mock-proposal',
};
const mintDelay = 144;

const prepareTest = () =>
  simnet.mineBlock([
    tx.callPublicFn(
      contracts.dao,
      'construct',
      [Cl.contractPrincipal(simnet.deployer, contracts.boot)],
      simnet.deployer
    ),
  ]);

const requestMint = () =>
  simnet.callPublicFn(contracts.endpoint, 'request-mint', [Cl.uint(100e6)], user);

const requestBurn = (payload: Buffer) =>
  simnet.mineBlock([
    tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
    tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
    tx.callPublicFn(contracts.manager, 'fund-strategy', [Cl.uint(100e6)], manager),
    tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
    tx.callPublicFn(contracts.rebase1, 'request-burn', [Cl.uint(100e6)], user),
  ]);

const getRewardCycle = () => {
  return (
    simnet.callReadOnlyFn(
      contracts.endpoint,
      'get-reward-cycle',
      [Cl.uint(simnet.blockHeight)],
      user
    ).result as ResponseOkCV<UIntCV>
  ).value.value;
};

const getRequestCycle = () => {
  return (
    simnet.callReadOnlyFn(
      contracts.endpoint,
      'get-request-cycle',
      [Cl.uint(simnet.blockHeight)],
      user
    ).result as ResponseOkCV<UIntCV>
  ).value.value;
};

const getRequestCutoff = () => {
  return (
    simnet.callReadOnlyFn(contracts.endpoint, 'get-request-cutoff', [], user)
      .result as ResponseOkCV<UIntCV>
  ).value;
};
const getBlocksToStartOfCycle = (cycle: bigint) => {
  return (
    Number(
      (
        simnet.callReadOnlyFn(
          contracts.endpoint,
          'get-first-burn-block-in-reward-cycle',
          [Cl.uint(cycle)],
          user
        ).result as ResponseOkCV<UIntCV>
      ).value
    ) - simnet.blockHeight
  );
};

const goToNextCycle = () => {
  const cycle = getRewardCycle();
  const blocksToMine = getBlocksToStartOfCycle(cycle + 1n);

  simnet.mineEmptyBlocks(blocksToMine);
};

describe(contracts.endpoint, () => {
  it('can request mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    const response = requestMint();
    expect(response.result).toBeOk(Cl.uint(1));
  });

  it('can finalize mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    goToNextCycle();

    const finaliseErr = simnet.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot);
    expect(finaliseErr.result).toBeErr(Cl.uint(7006));

    simnet.mineEmptyBlocks(mintDelay);

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-mint', [Cl.uint(1)], user),
    ]);
    expect(responses[0].result).toBeOk(Cl.bool(true));
    expect(responses[1].result).toBeErr(Cl.uint(7007));
  });

  it('can revoke mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'revoke-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-mint', [Cl.uint(1)], user),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(3000));
    expect(responses[1].result).toBeOk(Cl.bool(true));

    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay); // mint-delay

    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(7007));
  });

  it('can request burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);

    const payload = simnet.callReadOnlyFn(
      contracts.strategy,
      'create-payload',
      [Cl.uint(100e6)],
      manager
    ).result.buffer;
    const responses = requestBurn(payload);
    expect(responses[0].result).toBeOk(Cl.uint(0));
    expect(responses[1].result).toBeOk(Cl.bool(true));
    expect(responses[2].result).toBeOk(Cl.uint(100e6));
    expect(responses[3].result).toBeOk(Cl.uint(100e6));
    expect(responses[4].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );
  });

  it('can finalize burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);

    const payload = simnet.callReadOnlyFn(
      contracts.strategy,
      'create-payload',
      [Cl.uint(100e6)],
      manager
    ).result.buffer;
    const burnResponses = requestBurn(payload);
    expect(burnResponses[0].result).toBeOk(Cl.uint(0));
    expect(burnResponses[1].result).toBeOk(Cl.bool(true));
    expect(burnResponses[2].result).toBeOk(Cl.uint(100e6));
    expect(burnResponses[3].result).toBeOk(Cl.uint(100e6));
    expect(burnResponses[4].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );

    const responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.uint(100e6)], manager),
      tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
      tx.callPublicFn(contracts.rebase1, 'finalize-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], user),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(100e6));
    expect(responses[1].result).toBeOk(Cl.uint(100e6));
    expect(responses[2].result).toBeOk(Cl.bool(true));
    expect(responses[3].result).toBeErr(Cl.uint(7007));
  });

  it('can revoke burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);

    const payload = simnet.callReadOnlyFn(
      contracts.strategy,
      'create-payload',
      [Cl.uint(100e6)],
      manager
    ).result.buffer;
    const burnResponses = requestBurn(payload);
    expect(burnResponses[0].result).toBeOk(Cl.uint(0));
    expect(burnResponses[1].result).toBeOk(Cl.bool(true));
    expect(burnResponses[2].result).toBeOk(Cl.uint(100e6));
    expect(burnResponses[3].result).toBeOk(Cl.uint(100e6));
    expect(burnResponses[4].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );

    const responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.uint(100e6)], manager),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], user),
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(100e6));
    expect(responses[1].result).toBeErr(Cl.uint(3000));
    expect(responses[2].result).toBeOk(Cl.bool(true));
    expect(responses[3].result).toBeErr(Cl.uint(7007));
  });

  it('can request burn and finalized immediately', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    expect(requestMint().result).toBeOk(Cl.uint(1));

    let response;
    response = simnet.callPublicFn(contracts.rebase1, 'request-burn', [Cl.uint(100e6)], user);
    expect(response.result).toBeErr(Cl.uint(1)); // not enough funds

    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);
    response = simnet.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot);
    expect(response.result).toBeOk(Cl.bool(true));
    expect(response.events[2].event).toBe('nft_burn_event');
    response = simnet.callPublicFn(contracts.rebase1, 'request-burn', [Cl.uint(100e6)], user);
    expect(response.result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.buffer(new Uint8Array([1])) })
    );
    expect(response.events[7].event).toBe('nft_mint_event');
    expect(response.events[17].event).toBe('nft_burn_event');
  });

  it('can interact with strategies', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    const cycle = getRewardCycle();
    const blocksToMine = getBlocksToStartOfCycle(cycle + 1n);
    simnet.mineEmptyBlocks(blocksToMine - 100);

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.manager, 'fund-strategy', [Cl.uint(100e6)], bot),
      tx.callPublicFn(contracts.manager, 'fund-strategy', [Cl.uint(100e6)], manager),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(7006));
    expect(responses[1].result).toBeErr(Cl.uint(1000));
    expect(responses[2].result).toBeOk(Cl.uint(100e6));

    simnet.mineEmptyBlocks(99); // go to the next cycle
    simnet.mineEmptyBlocks(mintDelay);

    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.rebase1, 'request-burn', [Cl.uint(100e6)], user),
      tx.callPublicFn(contracts.rebase1, 'finalize-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.uint(100e6)], bot),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.uint(100e6)], manager),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.uint(100e6)], manager),
      tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
      tx.callPublicFn(contracts.rebase1, 'finalize-burn', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeOk(Cl.bool(true));
    expect(responses[1].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );
    expect(responses[2].result).toBeErr(Cl.uint(7006));
    expect(responses[3].result).toBeErr(Cl.uint(1000));
    expect(responses[4].result).toBeOk(Cl.uint(100e6));
    expect(responses[5].result).toBeErr(Cl.uint(1));
    expect(responses[6].result).toBeOk(Cl.uint(100e6));
    expect(responses[7].result).toBeOk(Cl.bool(true));
  });

  it('can set up amm pool', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    goToNextCycle();

    const finaliseErr = simnet.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot);
    expect(finaliseErr.result).toBeErr(Cl.uint(7006));

    simnet.mineEmptyBlocks(mintDelay);

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(
        contracts.amm,
        'create-pool',
        [
          Cl.principal(simnet.deployer + '.' + contracts.wstx),
          Cl.principal(simnet.deployer + '.' + contracts.wlqstx),
          Cl.uint(1e8),
          Cl.principal(user),
          Cl.uint(1e8),
          Cl.uint(1e8),
        ],
        user
      ),
    ]);
    expect(responses[0].result).toBeOk(Cl.bool(true));
    expect(responses[1].result).toBeOk(Cl.bool(true));
  });

  it('operator extension works', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    let responses = simnet.mineBlock([
      tx.callPublicFn(
        contracts.operators,
        'propose',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal)],
        bot
      ),
      tx.callPublicFn(
        contracts.operators,
        'propose',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal)],
        simnet.deployer
      ),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(1001));
    expect(responses[1].result).toBeOk(Cl.bool(false));

    responses = simnet.mineBlock([
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(true)],
        bot
      ),
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(true)],
        manager
      ),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(1001));
    expect(responses[1].result).toBeOk(Cl.bool(true));
  });

  it('request cycle respects cutoff', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(getRequestCycle()).toBe(0n);
    // cycle length - prepare cycle length - cutoff - blocks for deployment and prepare
    simnet.mineEmptyBlocks(1050 - 50 - 100 - 6);
    // we are at the end of request cycle 0
    expect(simnet.blockHeight).toBe(899);
    expect(getRequestCycle()).toBe(0n);

    simnet.mineEmptyBlocks(1050); // cycle length
    // we are at end of request cycle 1
    expect(simnet.blockHeight).toBe(1949);
    expect(getRequestCycle()).toBe(1n);

    simnet.mineEmptyBlocks(1);
    // we are at beginning of request cycle 2
    // that is 1050 + 1050 - 50 - 100
    expect(simnet.blockHeight).toBe(1950);
    expect(getRequestCycle()).toBe(2n);

    const response = requestMint();
    expect(response.result).toBeOk(Cl.uint(1));
    expect(response.events[0].event).toBe('stx_transfer_event');
    expect(response.events[1].event).toBe('nft_mint_event');
    expect(response.events[2].event).toBe('print_event');
    expect(
      ((response.events[2].data.value as TupleCV).data.details as TupleCV).data['requested-at']
    ).toBeUint(2);
  });
});
