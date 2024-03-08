import { tx } from '@hirosystems/clarinet-sdk';
import { Cl } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';

const accounts = simnet.getAccounts();
const user = accounts.get('wallet_1')!;
const oracle = accounts.get('wallet_2')!;
const bot = accounts.get('wallet_3')!;
const manager = accounts.get('wallet_4')!;

const contracts = {
  endpoint: 'lqstx-mint-endpoint',
  registry: 'lqstx-mint-registry',
  vault: 'lqstx-vault',
  lqstx: 'token-lqstx',
  vlqstx: 'token-vlqstx',
  wstx: 'token-wstx',
  strategy: 'mock-strategy',
  rebase: 'lisa-rebase',
  rebase1: 'rebase-mock',
  amm: 'amm-swap-pool-v1-1',
  wlqstx: 'token-wlqstx',
  dao: 'lisa-dao',
  boot: 'regtest-boot',
  manager: 'mock-strategy-manager',
  operators: 'operators',
  proposal: 'mock-proposal'
}

const prepareTest = () =>
  simnet.mineBlock([
    tx.callPublicFn(
      contracts.dao,
      'construct',
      [
        Cl.contractPrincipal(simnet.deployer, contracts.boot),
      ],
      simnet.deployer,
    ),
  ]);

const requestMint = () =>
  simnet.callPublicFn(
    contracts.endpoint,
    'request-mint',
    [Cl.uint(100e6)],
    user,
  )

const requestBurn = (payload: Buffer) =>
  simnet.mineBlock([
    tx.callPublicFn(
      contracts.rebase1,
      'rebase',
      [],
      oracle
    ),
    tx.callPublicFn(
      contracts.rebase1,
      'finalize-mint',
      [Cl.uint(1)],
      bot
    ),
    tx.callPublicFn(
      contracts.manager,
      'fund-strategy',
      [
        Cl.uint(100e6)
      ],
      manager
    ),
    tx.callPublicFn(
      contracts.rebase1,
      'rebase',
      [],
      oracle
    ),
    tx.callPublicFn(
      contracts.endpoint,
      'request-burn',
      [
        Cl.uint(100e6),
        Cl.contractPrincipal(simnet.deployer, contracts.rebase1),
      ],
      user
    ),
  ]);

describe(contracts.endpoint, () => {
  // it('can request mint', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   const response = requestMint();
  //   expect(response.result).toBeOk(Cl.uint(1));
  // });

  // it('can finalize mint', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   expect(requestMint().result).toBeOk(Cl.uint(1));

  //   const cycle = simnet.callReadOnlyFn(contracts.endpoint, 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], user).result.value.value;
  //   const blocksToMine = Number(simnet.callReadOnlyFn(contracts.endpoint, 'get-first-stacks-block-in-reward-cycle', [Cl.uint(cycle + 1n)], user).result.value) - simnet.blockHeight;
  //   simnet.mineEmptyBlocks(blocksToMine); // go to the next cycle

  //   const finaliseErr = simnet.callPublicFn(
  //     contracts.rebase1,
  //     'finalize-mint',
  //     [Cl.uint(1)],
  //     bot
  //   );
  //   expect(finaliseErr.result).toBeErr(Cl.uint(1006));

  //   simnet.mineEmptyBlocks(144); // mint-delay

  //   let responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-mint',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.endpoint,
  //       'revoke-mint',
  //       [Cl.uint(1)],
  //       user
  //     ),
  //   ]);
  //   expect(responses[0].result).toBeOk(Cl.bool(true));
  //   expect(responses[1].result).toBeErr(Cl.uint(1007));
  // });

  // it('can revoke mint', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   expect(requestMint().result).toBeOk(Cl.uint(1));

  //   let responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.endpoint,
  //       'revoke-mint',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.endpoint,
  //       'revoke-mint',
  //       [Cl.uint(1)],
  //       user
  //     ),
  //   ]);
  //   expect(responses[0].result).toBeErr(Cl.uint(1000));
  //   expect(responses[1].result).toBeOk(Cl.bool(true));

  //   const cycle = simnet.callReadOnlyFn(contracts.endpoint, 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], user).result.value.value;
  //   const blocksToMine = Number(simnet.callReadOnlyFn(contracts.endpoint, 'get-first-stacks-block-in-reward-cycle', [Cl.uint(cycle + 1n)], user).result.value) - simnet.blockHeight;
  //   simnet.mineEmptyBlocks(blocksToMine); // go to the next cycle
  //   simnet.mineEmptyBlocks(144); // mint-delay

  //   responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-mint',
  //       [Cl.uint(1)],
  //       bot
  //     )
  //   ]);
  //   expect(responses[0].result).toBeErr(Cl.uint(1007));
  // });

  // it('can request burn', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   expect(requestMint().result).toBeOk(Cl.uint(1));
  //   const cycle = simnet.callReadOnlyFn(contracts.endpoint, 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], user).result.value.value;
  //   const blocksToMine = Number(simnet.callReadOnlyFn(contracts.endpoint, 'get-first-stacks-block-in-reward-cycle', [Cl.uint(cycle + 1n)], user).result.value) - simnet.blockHeight;
  //   simnet.mineEmptyBlocks(blocksToMine); // go to the next cycle
  //   simnet.mineEmptyBlocks(144); // mint-delay

  //   const payload = simnet.callReadOnlyFn(
  //     contracts.strategy,
  //     'create-payload',
  //     [Cl.uint(100e6)],
  //     manager
  //   ).result.buffer;
  //   const responses = requestBurn(payload);
  //   expect(responses[0].result).toBeOk(Cl.uint(0));
  //   expect(responses[1].result).toBeOk(Cl.bool(true));
  //   expect(responses[2].result).toBeOk(Cl.uint(100e6));
  //   expect(responses[3].result).toBeOk(Cl.uint(100e6));
  //   expect(responses[4].result).toBeOk(Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') }));
  // });

  // it('can finalize burn', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   expect(requestMint().result).toBeOk(Cl.uint(1));
  //   const cycle = simnet.callReadOnlyFn(contracts.endpoint, 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], user).result.value.value;
  //   const blocksToMine = Number(simnet.callReadOnlyFn(contracts.endpoint, 'get-first-stacks-block-in-reward-cycle', [Cl.uint(cycle + 1n)], user).result.value) - simnet.blockHeight;
  //   simnet.mineEmptyBlocks(blocksToMine); // go to the next cycle
  //   simnet.mineEmptyBlocks(144); // mint-delay

  //   const payload = simnet.callReadOnlyFn(
  //     contracts.strategy,
  //     'create-payload',
  //     [Cl.uint(100e6)],
  //     manager
  //   ).result.buffer;
  //   const burnResponses = requestBurn(payload);
  //   expect(burnResponses[0].result).toBeOk(Cl.uint(0));
  //   expect(burnResponses[1].result).toBeOk(Cl.bool(true));
  //   expect(burnResponses[2].result).toBeOk(Cl.uint(100e6));
  //   expect(burnResponses[3].result).toBeOk(Cl.uint(100e6));
  //   expect(burnResponses[4].result).toBeOk(Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') }));

  //   const responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.manager,
  //       'refund-strategy',
  //       [
  //         Cl.uint(100e6)
  //       ],
  //       manager
  //     ),
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'rebase',
  //       [],
  //       oracle
  //     ),
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-burn',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.endpoint,
  //       'revoke-burn',
  //       [Cl.uint(1)],
  //       user
  //     ),
  //   ]);
  //   expect(responses[0].result).toBeOk(Cl.uint(100e6));
  //   expect(responses[1].result).toBeOk(Cl.uint(100e6));
  //   expect(responses[2].result).toBeOk(Cl.bool(true));
  //   expect(responses[3].result).toBeErr(Cl.uint(1007));

  // });

  // it('can revoke burn', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   expect(requestMint().result).toBeOk(Cl.uint(1));
  //   const cycle = simnet.callReadOnlyFn(contracts.endpoint, 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], user).result.value.value;
  //   const blocksToMine = Number(simnet.callReadOnlyFn(contracts.endpoint, 'get-first-stacks-block-in-reward-cycle', [Cl.uint(cycle + 1n)], user).result.value) - simnet.blockHeight;
  //   simnet.mineEmptyBlocks(blocksToMine); // go to the next cycle
  //   simnet.mineEmptyBlocks(144); // mint-delay

  //   const payload = simnet.callReadOnlyFn(
  //     contracts.strategy,
  //     'create-payload',
  //     [Cl.uint(100e6)],
  //     manager
  //   ).result.buffer;
  //   const burnResponses = requestBurn(payload);
  //   expect(burnResponses[0].result).toBeOk(Cl.uint(0));
  //   expect(burnResponses[1].result).toBeOk(Cl.bool(true));
  //   expect(burnResponses[2].result).toBeOk(Cl.uint(100e6));
  //   expect(burnResponses[3].result).toBeOk(Cl.uint(100e6));
  //   expect(burnResponses[4].result).toBeOk(Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') }));

  //   const responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.manager,
  //       'refund-strategy',
  //       [
  //         Cl.uint(100e6)
  //       ],
  //       manager
  //     ),
  //     tx.callPublicFn(
  //       contracts.endpoint,
  //       'revoke-burn',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.endpoint,
  //       'revoke-burn',
  //       [Cl.uint(1)],
  //       user
  //     ),
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-mint',
  //       [Cl.uint(1)],
  //       bot
  //     )
  //   ]);
  //   expect(responses[0].result).toBeOk(Cl.uint(100e6));
  //   expect(responses[1].result).toBeErr(Cl.uint(1000));
  //   expect(responses[2].result).toBeOk(Cl.bool(true));
  //   expect(responses[3].result).toBeErr(Cl.uint(1007));
  // });

  // it('can interact with strategies', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   expect(requestMint().result).toBeOk(Cl.uint(1));

  //   const payload = simnet.callReadOnlyFn(
  //     contracts.strategy,
  //     'create-payload',
  //     [Cl.uint(100e6)],
  //     manager
  //   ).result.buffer;

  //   const cycle = simnet.callReadOnlyFn(contracts.endpoint, 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], user).result.value.value;
  //   const blocksToMine = Number(simnet.callReadOnlyFn(contracts.endpoint, 'get-first-stacks-block-in-reward-cycle', [Cl.uint(cycle + 1n)], user).result.value) - simnet.blockHeight;
  //   simnet.mineEmptyBlocks(blocksToMine - 100);

  //   let responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-mint',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.manager,
  //       'fund-strategy',
  //       [
  //         Cl.uint(100e6)
  //       ],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.manager,
  //       'fund-strategy',
  //       [
  //         Cl.uint(100e6)
  //       ],
  //       manager
  //     ),
  //   ]);
  //   expect(responses[0].result).toBeErr(Cl.uint(1006));
  //   expect(responses[1].result).toBeErr(Cl.uint(1000));
  //   expect(responses[2].result).toBeOk(Cl.uint(100e6));

  //   simnet.mineEmptyBlocks(99); // go to the next cycle
  //   simnet.mineEmptyBlocks(144); // mint-delay

  //   responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-mint',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.endpoint,
  //       'request-burn',
  //       [
  //         Cl.uint(100e6),
  //         Cl.contractPrincipal(simnet.deployer, contracts.rebase1),
  //       ],
  //       user
  //     ),
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-burn',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.manager,
  //       'refund-strategy',
  //       [
  //         Cl.uint(100e6)
  //       ],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.manager,
  //       'refund-strategy',
  //       [
  //         Cl.uint(100e6)
  //       ],
  //       manager
  //     ),
  //     tx.callPublicFn(
  //       contracts.manager,
  //       'refund-strategy',
  //       [
  //         Cl.uint(100e6)
  //       ],
  //       manager
  //     ),
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'rebase',
  //       [],
  //       oracle
  //     ),
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-burn',
  //       [Cl.uint(1)],
  //       bot
  //     )
  //   ]);
  //   expect(responses[0].result).toBeOk(Cl.bool(true));
  //   expect(responses[1].result).toBeOk(Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('00') }));
  //   expect(responses[2].result).toBeErr(Cl.uint(1006));
  //   expect(responses[3].result).toBeErr(Cl.uint(1000));
  //   expect(responses[4].result).toBeOk(Cl.uint(100e6));
  //   expect(responses[5].result).toBeErr(Cl.uint(1));
  //   expect(responses[6].result).toBeOk(Cl.uint(100e6));
  //   expect(responses[7].result).toBeOk(Cl.bool(true));
  // });

  // it('can set up amm pool', () => {
  //   prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

  //   expect(requestMint().result).toBeOk(Cl.uint(1));

  //   const cycle = simnet.callReadOnlyFn(contracts.endpoint, 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], user).result.value.value;
  //   const blocksToMine = Number(simnet.callReadOnlyFn(contracts.endpoint, 'get-first-stacks-block-in-reward-cycle', [Cl.uint(cycle + 1n)], user).result.value) - simnet.blockHeight;
  //   simnet.mineEmptyBlocks(blocksToMine); // go to the next cycle

  //   const finaliseErr = simnet.callPublicFn(
  //     contracts.rebase1,
  //     'finalize-mint',
  //     [Cl.uint(1)],
  //     bot
  //   );
  //   expect(finaliseErr.result).toBeErr(Cl.uint(1006));

  //   simnet.mineEmptyBlocks(144); // mint-delay

  //   let responses = simnet.mineBlock([
  //     tx.callPublicFn(
  //       contracts.rebase1,
  //       'finalize-mint',
  //       [Cl.uint(1)],
  //       bot
  //     ),
  //     tx.callPublicFn(
  //       contracts.amm,
  //       'create-pool',
  //       [
  //         Cl.principal(simnet.deployer + '.' + contracts.wstx),
  //         Cl.principal(simnet.deployer + '.' + contracts.wlqstx),
  //         Cl.uint(1e8),
  //         Cl.principal(user),
  //         Cl.uint(1e8),
  //         Cl.uint(1e8)
  //       ],
  //       user
  //     )
  //   ]);
  //   expect(responses[0].result).toBeOk(Cl.bool(true));
  //   expect(responses[1].result).toBeOk(Cl.bool(true));
  // });

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
        simnet.deployer
      ),            
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(1001));
    console.log(responses[3].result);
    expect(responses[1].result).toBeOk(Cl.bool(true));
    expect(responses[2].result).toBeErr(Cl.uint(1001));
    expect(responses[3].result).toBeOk(Cl.bool(true));
  });  
});
