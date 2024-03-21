// SPDX-License-Identifier: BUSL-1.1

import { tx } from '@hirosystems/clarinet-sdk';
import { Cl, ResponseOkCV, TupleCV, UIntCV, cvToString } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';

const mintDelay = 432;
const accounts = simnet.getAccounts();
const user = accounts.get('wallet_1')!;
const oracle = accounts.get('wallet_2')!;
const bot = accounts.get('wallet_3')!;
const manager = accounts.get('deployer')!;
const operator = accounts.get('wallet_4')!;
const user2 = accounts.get('wallet_5')!;

const contracts = {
  endpoint: 'lqstx-mint-endpoint-v1-02',
  registry: 'lqstx-mint-registry',
  vault: 'lqstx-vault',
  lqstx: 'token-lqstx',
  vlqstx: 'token-vlqstx',
  wstx: 'token-wstx',
  strategy: 'public-pools-strategy',
  rebase: 'lisa-rebase-v1-02',
  rebase1: 'rebase-1-v1-02',
  amm: 'amm-swap-pool-v1-1',
  wlqstx: 'token-wlqstx',
  dao: 'lisa-dao',
  boot: 'simnet-boot',
  manager: 'public-pools-strategy-manager',
  operators: 'operators',
  proposal: 'mock-proposal',
};

const prepareTest = () =>
  simnet.mineBlock([
    tx.callPublicFn(
      contracts.dao,
      'construct',
      [Cl.contractPrincipal(simnet.deployer, contracts.boot)],
      simnet.deployer
    ),
  ]);

const getRewardCycle = () => {
  return (
    simnet.callReadOnlyFn(
      contracts.endpoint,
      'get-reward-cycle',
      [Cl.uint(simnet.blockHeight)],
      user
    ).result as UIntCV
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
        ).result as UIntCV
      ).value
    ) - simnet.blockHeight
  );
};
const goToNextCycle = () => {
  const cycle = getRewardCycle();
  const blocksToMine = getBlocksToStartOfCycle(cycle + 1n);

  simnet.mineEmptyBlocks(blocksToMine);
};

// 1m STX
const mintAmount = 1_000_000e6;

const requestMint = () =>
  simnet.callPublicFn(contracts.endpoint, 'request-mint', [Cl.uint(mintAmount)], user);

// lock mintAmount stx and request burn of 1 stx
const requestBurn = () =>
  simnet.mineBlock([
    tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
    tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
    tx.callPublicFn(contracts.manager, 'fund-strategy', [Cl.list([Cl.uint(mintAmount)])], manager),
    tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
    tx.callPublicFn(contracts.rebase1, 'request-burn', [Cl.uint(1e6)], user),
  ]);

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

    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

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
    simnet.mineEmptyBlocks(mintDelay + 1);
    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(7007));
  });

  it('can request burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);

    const responses = requestBurn();
    expect(responses[0].result).toBeOk(Cl.uint(0));
    expect(responses[1].result).toBeOk(Cl.bool(true));
    expect(responses[2].result).toBeOk(Cl.uint(mintAmount));
    expect(responses[3].result).toBeOk(Cl.uint(mintAmount));
    console.log(cvToString(responses[4].result));
    expect(responses[4].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );
  });

  it('can finalize burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);

    const burnResponses = requestBurn();
    expect(burnResponses[0].result).toBeOk(Cl.uint(0));
    expect(burnResponses[1].result).toBeOk(Cl.bool(true));
    expect(burnResponses[2].result).toBeOk(Cl.uint(mintAmount));
    expect(burnResponses[3].result).toBeOk(Cl.uint(mintAmount));
    expect(burnResponses[4].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );

    const responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
      tx.callPublicFn(contracts.rebase1, 'finalize-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], user),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(1e6));
    expect(responses[1].result).toBeOk(Cl.uint(mintAmount));
    expect(responses[2].result).toBeOk(Cl.bool(true));
    expect(responses[3].result).toBeErr(Cl.uint(7007));
  });

  it('can revoke burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);

    const burnResponses = requestBurn();
    expect(burnResponses[0].result).toBeOk(Cl.uint(0));
    expect(burnResponses[1].result).toBeOk(Cl.bool(true));
    expect(burnResponses[2].result).toBeOk(Cl.uint(mintAmount));
    expect(burnResponses[3].result).toBeOk(Cl.uint(mintAmount));
    expect(burnResponses[4].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );

    const responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], user),
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(1e6));
    expect(responses[1].result).toBeErr(Cl.uint(3000));
    expect(responses[2].result).toBeOk(Cl.bool(true));
    expect(responses[3].result).toBeErr(Cl.uint(7007));
  });

  it('can interact with strategies', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    const cycle = (
      simnet.callReadOnlyFn(
        contracts.endpoint,
        'get-reward-cycle',
        [Cl.uint(simnet.blockHeight)],
        user
      ).result as UIntCV
    ).value;
    const blocksToMine =
      Number(
        (
          simnet.callReadOnlyFn(
            contracts.endpoint,
            'get-first-burn-block-in-reward-cycle',
            [Cl.uint(cycle + 1n)],
            user
          ).result as UIntCV
        ).value
      ) - simnet.blockHeight;
    simnet.mineEmptyBlocks(blocksToMine - 100);

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.manager, 'fund-strategy', [Cl.list([Cl.uint(mintAmount)])], bot),
      tx.callPublicFn(
        contracts.manager,
        'fund-strategy',
        [Cl.list([Cl.uint(mintAmount)])],
        manager
      ),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(7006)); // request pending
    expect(responses[1].result).toBeErr(Cl.uint(3000)); // not authorized
    expect(responses[2].result).toBeOk(Cl.uint(mintAmount)); // mintAmount stx transferred, mintAmount - 1 stx locked

    const stxAccountFastPoolMember1 = simnet.runSnippet(
      `(stx-account '${simnet.deployer}.fastpool-member1)`
    ) as TupleCV<{ locked: UIntCV; unlocked: UIntCV }>;
    expect(stxAccountFastPoolMember1.data.locked).toBeUint(mintAmount - 1e6);

    goToNextCycle(); // go to the next cycle
    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.rebase1, 'request-burn', [Cl.uint(mintAmount)], user),
      tx.callPublicFn(contracts.rebase1, 'request-burn', [Cl.uint(1e6)], user),
      tx.callPublicFn(contracts.rebase1, 'finalize-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], bot),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.rebase1, 'rebase', [], oracle),
      tx.callPublicFn(contracts.rebase1, 'finalize-burn', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeOk(Cl.bool(true));
    expect(responses[1].result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );
    expect(responses[2].result).toBeErr(Cl.uint(1)); // not enough funds
    expect(responses[3].result).toBeErr(Cl.uint(7006)); // request pending
    expect(responses[4].result).toBeErr(Cl.uint(3000)); // not authorized
    expect(responses[5].result).toBeOk(Cl.uint(1e6)); // refund 1 stx
    expect(responses[6].result).toBeOk(Cl.uint(0)); // refund 0 stx
    expect(responses[7].result).toBeOk(Cl.uint(mintAmount)); // rebase mintAmount stx
    expect(responses[8].result).toBeErr(Cl.uint(7006)); // request pending

    // refund remaining stx after unlock
    goToNextCycle();
    simnet.mineEmptyBlocks(1);

    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.rebase1, 'finalize-burn', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(mintAmount - 1e6));
    expect(responses[1].result).toBeOk(Cl.bool(true));
  });

  // user1 mints 100 STX, user2 100m STX
  it('can rebase', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    let response;
    response = simnet.callPublicFn(contracts.endpoint, 'request-mint', [Cl.uint(100e6)], user);
    expect(response.result).toBeOk(Cl.uint(1));
    response = simnet.callPublicFn(
      contracts.endpoint,
      'request-mint',
      [Cl.uint(100_000_000e6)],
      user2
    );
    expect(response.result).toBeOk(Cl.uint(2));

    goToNextCycle(); // go to the next cycle
    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

    response = simnet.callPublicFn(contracts.rebase1, 'rebase', [], oracle);
    expect(response.result).toBeOk(Cl.uint(0));

    response = simnet.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot);
    expect(response.result).toBeOk(Cl.bool(true));
    response = simnet.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(2)], bot);
    expect(response.result).toBeOk(Cl.bool(true));

    response = simnet.callPublicFn(
      contracts.manager,
      'fund-strategy',
      [
        Cl.list([
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
          Cl.uint(5_000_000e6),
        ]),
      ],
      manager
    );
    response = simnet.callPublicFn(contracts.rebase1, 'rebase', [], oracle);
    expect(response.result).toBeOk(Cl.uint(100_000_100e6));

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [Cl.standardPrincipal(user)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(100e6));

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-share',
      [Cl.standardPrincipal(user)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(100e6));

    // receive rewards
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-member1`, oracle);
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-member2`, oracle);
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-member3`, oracle);
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-member4`, oracle);

    response = simnet.callPublicFn(contracts.rebase1, 'rebase', [], oracle);
    expect(response.result).toBeOk(Cl.uint(104_000_100e6));

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [Cl.standardPrincipal(user)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(103_999_996));

    response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-share',
      [Cl.standardPrincipal(user)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(100e6));
  });

  it('can set up amm pool', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint().result).toBeOk(Cl.uint(1));

    goToNextCycle(); // go to the next cycle

    const finaliseErr = simnet.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot);
    expect(finaliseErr.result).toBeErr(Cl.uint(7006));

    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

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
});
