// SPDX-License-Identifier: BUSL-1.1

import { initSimnet, tx } from '@hirosystems/clarinet-sdk';
import { Cl, TupleCV, UIntCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';
import { createClientMockSetup } from './clients/mock-client';

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
} = createClientMockSetup();

// 1m STX
const mintAmount = 1_000_000e6;
const mintDelay = 432;

describe(contracts.endpoint, () => {
  it('can request mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    const response = requestMint(mintAmount);
    expect(response.result).toBeOk(Cl.uint(1));
  });

  it('can finalize mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));

    goToNextCycle();

    const finaliseErr = simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot);
    expect(finaliseErr.result).toBeErr(Cl.uint(7006));

    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-mint', [Cl.uint(1)], user),
    ]);
    expect(responses[0].result).toBeOk(Cl.bool(true));
    expect(responses[1].result).toBeErr(Cl.uint(7007));
  });

  it('can revoke mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'revoke-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-mint', [Cl.uint(1)], user),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(3000));
    expect(responses[1].result).toBeOk(Cl.bool(true));

    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);
    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(7007));
  });

  it.only('can request burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));
    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(2));

    goToNextRequestCycle();
    let response = fundStrategy(mintAmount);
    console.log(response.events.map(e => JSON.stringify(e.data)));
    expect(response.result).toBeOk(Cl.uint(mintAmount));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);
    expect(finalizeMint(1).result).toBeOk(Cl.bool(true));

    expect(requestBurn(mintAmount).result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );
  });

  it('can finalize burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));

    goToNextRequestCycle();
    expect(fundStrategy(mintAmount).result).toBeOk(Cl.uint(mintAmount));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);
    expect(finalizeMint(1).result).toBeOk(Cl.bool(true));

    expect(requestBurn(1e6).result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );

    const responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.endpoint, 'finalize-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], user),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(1e6));
    expect(responses[1].result).toBeOk(Cl.bool(true));
    expect(responses[2].result).toBeErr(Cl.uint(7007));
  });

  it('can revoke burn', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));

    goToNextRequestCycle();
    expect(fundStrategy(mintAmount).result).toBeOk(Cl.uint(mintAmount));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);
    expect(finalizeMint(1).result).toBeOk(Cl.bool(true));

    expect(requestBurn(mintAmount).result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );

    const responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'revoke-burn', [Cl.uint(1)], user),
      tx.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(1e6));
    expect(responses[1].result).toBeErr(Cl.uint(3000));
    expect(responses[2].result).toBeOk(Cl.bool(true));
    expect(responses[3].result).toBeErr(Cl.uint(7007));
  });

  it('can interact with strategies', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));

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
      tx.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot),
      // try to fund as a normal user
      tx.callPublicFn(contracts.manager, 'fund-strategy', [Cl.list([Cl.uint(mintAmount)])], bot),
      // fund as a manager
      tx.callPublicFn(
        contracts.manager,
        'fund-strategy',
        [Cl.list([Cl.uint(mintAmount)])],
        manager
      ),
      tx.callPublicFn(contracts.manager, 'fund-strategy', [Cl.list([Cl.uint(mintAmount)])], bot),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(7006)); // request pending
    expect(responses[1].result).toBeErr(Cl.uint(3000)); // not authorized
    expect(responses[2].result).toBeOk(Cl.uint(mintAmount)); // mintAmount stx transferred, mintAmount - 1 stx locked

    const stxAccountFastPoolMember1 = simnet.runSnippet(
      `(stx-account '${simnet.deployer}.fastpool-v2-member1)`
    ) as TupleCV<{ locked: UIntCV; unlocked: UIntCV }>;
    expect(stxAccountFastPoolMember1.data.locked).toBeUint(mintAmount - 1e6);

    goToNextCycle(); // go to the next cycle
    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.endpoint, 'request-burn', [Cl.uint(mintAmount)], user),
      tx.callPublicFn(contracts.endpoint, 'request-burn', [Cl.uint(1e6)], user),
      tx.callPublicFn(contracts.endpoint, 'finalize-burn', [Cl.uint(1)], bot),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], bot),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.endpoint, 'finalize-burn', [Cl.uint(1)], bot),
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
    expect(responses[7].result).toBeErr(Cl.uint(7006)); // request pending

    // refund remaining stx after unlock
    goToNextCycle();
    simnet.mineEmptyBlocks(1);

    responses = simnet.mineBlock([
      tx.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      tx.callPublicFn(contracts.endpoint, 'finalize-burn', [Cl.uint(1)], bot),
    ]);
    expect(responses[0].result).toBeOk(Cl.uint(mintAmount - 1e6));
    expect(responses[1].result).toBeOk(Cl.bool(true));
  });

  // user1 mints 100 STX, user2 100m STX
  // FIXME: fails with an error that the mint-nft with id 2 already exists.
  it.only('can rebase', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    let response;
    response = simnet.callPublicFn(contracts.endpoint, 'request-mint', [Cl.uint(100e6)], user);
    expect(response.result).toBeOk(Cl.uint(1));
    console.log(response.events.map(e => JSON.stringify(e)));

    response = simnet.callPublicFn(
      contracts.endpoint,
      'request-mint',
      [Cl.uint(100_000_000e6)],
      user2
    );
    expect(response.result).toBeOk(Cl.uint(2));

    goToNextCycle(); // go to the next cycle
    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

    response = simnet.callPublicFn(contracts.endpoint, 'rebase', [], oracle);
    expect(response.result).toBeOk(Cl.uint(0));

    response = simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot);
    expect(response.result).toBeOk(Cl.bool(true));
    response = simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(2)], bot);
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
    response = simnet.callPublicFn(contracts.endpoint, 'rebase', [], oracle);
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
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-v2-member1`, oracle);
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-v2-member2`, oracle);
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-v2-member3`, oracle);
    response = simnet.transferSTX(1_000_000e6, `${simnet.deployer}.fastpool-v2-member4`, oracle);

    response = simnet.callPublicFn(contracts.endpoint, 'rebase', [], oracle);
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

  // FIXME: add amm as requirement
  it.skip('can set up amm pool', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));

    goToNextCycle(); // go to the next cycle

    const finaliseErr = simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot);
    expect(finaliseErr.result).toBeErr(Cl.uint(7006));

    simnet.mineEmptyBlocks(mintDelay + 1); // mint-delay

    let responses = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot),
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

  it('user can transfer burn nft', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    let response;

    // request and finalize mint for 1m STX
    expect(requestMint(mintAmount).result).toBeOk(Cl.uint(1));

    goToNextRequestCycle();
    expect(fundStrategy(mintAmount).result).toBeOk(Cl.uint(mintAmount));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay + 1);
    expect(finalizeMint(1).result).toBeOk(Cl.bool(true));

    expect(requestBurn(1e6).result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') })
    );

    // transfer burn of 1 stx
    response = simnet.callPublicFn(
      contracts.burnNft,
      'transfer',
      [Cl.uint(1), Cl.standardPrincipal(user), Cl.standardPrincipal(bot)],
      user
    );

    // bot is now owning the nft
    expect(simnet.callReadOnlyFn(contracts.burnNft, 'get-owner', [Cl.uint(1)], user).result).toBeOk(
      Cl.some(Cl.standardPrincipal(bot))
    );

    simnet.callPublicFn(contracts.manager, 'refund-strategy', [Cl.list([Cl.bool(true)])], manager),
      (response = simnet.callPublicFn(contracts.endpoint, 'finalize-burn', [Cl.uint(1)], bot));
    expect(response.result).toBeOk(Cl.bool(true));

    // check that bot received stx
    expect(simnet.getAssetsMap().get('STX')?.get(bot)).toBe(100000001_000_000n);
    expect(simnet.getAssetsMap().get('STX')?.get(user)).toBe(99000000_000_000n);

    // check that user has 1m - 1 liquid stx
    expect(simnet.getAssetsMap().get('.token-lqstx.lqstx')?.get(user)).toBe(999999_000_000n);
    expect(simnet.getAssetsMap().get('.token-vlqstx.vlqstx')?.get(user)).toBe(0n);
  });
});
