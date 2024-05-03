import { tx } from '@hirosystems/clarinet-sdk';
import { IntegerType } from '@stacks/common';
import { poxAddressToTuple } from '@stacks/stacking';
import { Cl, ResponseOkCV, UIntCV, contractPrincipalCV, principalCV } from '@stacks/transactions';
import { expect } from 'vitest';

export const createClientMockSetup = () => {
  const accounts = simnet.getAccounts();
  const faucet = accounts.get('faucet')!!;
  const user = 'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7';
  const oracle = accounts.get('wallet_2')!;
  const bot = accounts.get('wallet_3')!;
  const manager = 'SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B';
  const operator3 = accounts.get('wallet_5')!;
  const user2 = accounts.get('wallet_4')!;

  const contracts = {
    endpoint: 'lqstx-mint-endpoint-v2-01',
    dao: 'lisa-dao',
    boot: 'boot',
    operators: 'operators',
    manager: 'public-pools-strategy-manager-v2',
    lqstx: 'token-lqstx',
    treasury: 'treasury',
    burnNft: 'li-stx-burn-nft',
    mintNft: 'li-stx-mint-nft',
    wstx: '',
    wlqstx: '',
    amm: '',
  };
  const executeLip = (lipContractId: string) => {
    simnet.mineBlock([
      tx.callPublicFn(
        contracts.operators,
        'propose',
        [principalCV(lipContractId)],
        'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7'
      ),
    ]);
    const result = simnet.mineBlock([
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [principalCV(lipContractId), Cl.bool(true)],
        'SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25'
      ),
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [principalCV(lipContractId), Cl.bool(true)],
        'SPSZ26REB731JN8H00TD010S600F4AB4Z8F0JRB7'
      ),
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [principalCV(lipContractId), Cl.bool(true)],
        'SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704'
      ),
    ]);
    expect(result[0].result).toBeOk(Cl.bool(false));
    expect(result[1].result).toBeOk(Cl.bool(false));
    expect(result[2].result).toBeOk(Cl.bool(true)); // executed
  };

  const prepareTest = () => {
    simnet.mineBlock([tx.transferSTX(100_000_000_000_000, user, faucet)]);
    simnet.mineBlock([tx.transferSTX(1_000_000_000, manager, faucet)]);
    simnet.mineBlock([
      tx.transferSTX(1_000_000_000, 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP', faucet),
    ]);

    const result1 = simnet.mineBlock([
      tx.callPublicFn(
        contracts.dao,
        'construct',
        [contractPrincipalCV(simnet.deployer, contracts.boot)],
        simnet.deployer
      ),
    ]);
    executeLip(`${simnet.deployer}.lip001`);

    // Do not mint NFTs because no mint requests were sent so far
    //executeLip('lip002');
    executeLip(`${simnet.deployer}.lip003`);
    executeLip(`${simnet.deployer}.lip004`);

    simnet.callPublicFn(
      'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox4-fast-pool-v3',
      'set-pool-pox-address-active',
      [poxAddressToTuple('bc1qs0kkdpsrzh3ngqgth7mkavlwlzr7lms2zv3wxe')],
      'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP'
    );

    return result1;
  };

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
