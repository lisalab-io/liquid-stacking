import { tx } from '@hirosystems/clarinet-sdk';
import { IntegerType } from '@stacks/common';
import { Cl, ResponseOkCV, UIntCV } from '@stacks/transactions';

export const createClientMockSetup = () => {
  const accounts = simnet.getAccounts();
  const user = accounts.get('wallet_1')!;
  const oracle = accounts.get('wallet_2')!;
  const bot = accounts.get('wallet_3')!;
  const manager = accounts.get('wallet_4')!;
  const operator3 = accounts.get('wallet_5')!;
  const user2 = accounts.get('wallet_6')!;

  const contracts = {
    endpoint: 'lqstx-mint-endpoint-v1-02',
    registry: 'lqstx-mint-registry',
    vault: 'lqstx-vault',
    lqstx: 'token-lqstx',
    vlqstx: 'token-vlqstx',
    wstx: 'token-wstx',
    strategy: 'public-pools-strategy',
    amm: 'amm-swap-pool-v1-1',
    wlqstx: 'token-wlqstx',
    dao: 'lisa-dao',
    boot: 'simnet-boot',
    manager: 'public-pools-strategy-manager',
    operators: 'operators',
    proposal: 'mock-proposal',
    proposal2: 'mock-proposal',
    mintNft: 'li-stx-mint-nft',
    burnNft: 'li-stx-burn-nft',
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

  const requestMint = (amount: IntegerType) =>
    simnet.callPublicFn(contracts.endpoint, 'request-mint', [Cl.uint(amount)], user);

  const requestBurn = (amount: IntegerType) =>
    simnet.callPublicFn(contracts.endpoint, 'request-burn', [Cl.uint(amount)], user);
  
  const fundStrategy = (amount: IntegerType) =>
    simnet.callPublicFn(contracts.manager, 'fund-strategy', [Cl.list([Cl.uint(amount)])], manager);
  
  const finalizeMint = (requestId: IntegerType) =>
    simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(requestId)], bot);

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

  const getRequestCycle = () => {
    return (
      simnet.callReadOnlyFn(
        contracts.endpoint,
        'get-request-cycle',
        [Cl.uint(simnet.blockHeight)],
        user
      ).result as UIntCV
    ).value;
  };

  const getRequestCutoff = () => {
    return (
      simnet.callReadOnlyFn(contracts.endpoint, 'get-request-cutoff', [], user).result as UIntCV
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

  const goToNextRequestCycle = () => {
    const cycle = getRequestCycle();
    const blocksToMine = getBlocksToStartOfCycle(cycle + 1n);

    simnet.mineEmptyBlocks(blocksToMine);
  };  

  const goToNextCycle = () => {
    const cycle = getRewardCycle();
    const blocksToMine = getBlocksToStartOfCycle(cycle + 1n);

    simnet.mineEmptyBlocks(blocksToMine);
  };

  const liSTXBalance = (user: string) => {
    return (
      simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [Cl.standardPrincipal(user)], user)
        .result as ResponseOkCV
    ).value;
  };
  return {
    contracts,
    prepareTest,
    requestMint,
    requestBurn,
    fundStrategy,
    finalizeMint,
    getRewardCycle,
    getRequestCycle,
    getBlocksToStartOfCycle,
    goToNextCycle,
    goToNextRequestCycle,
    getRequestCutoff,
    liSTXBalance,
    user,
    user2,
    oracle,
    bot,
    manager,
    operator3,
  };
};
