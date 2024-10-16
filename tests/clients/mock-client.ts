import { tx } from '@hirosystems/clarinet-sdk';
import { IntegerType } from '@stacks/common';
import { poxAddressToTuple } from '@stacks/stacking';
import { Cl, ResponseOkCV, UIntCV, noneCV, principalCV, uintCV } from '@stacks/transactions';
import { expect } from 'vitest';

// listx holding of alex vault before lip005
export const shares = 7802971780136; // from https://explorer.hiro.so/txid/0x821fd4ae7fe97cf712731a2f85a11a7e819de6ac534dcedff58fe27f8b14dcda?chain=mainnet
export const reserve = 7836428135082; // from https://explorer.hiro.so/txid/0x821fd4ae7fe97cf712731a2f85a11a7e819de6ac534dcedff58fe27f8b14dcda?chain=mainnet
export const factor = shares / reserve;

export const alexVaultHoldingShares = 1325539144827; // from https://stxscan.co/transactions/0xeadfe530ae96a9b78468dc0b5707fa7a40796af9063695d52f3e2571e99b893e
// alexVault holding after rewards before lip005
export const alexVaultHolding = Math.floor(alexVaultHoldingShares / factor); // 1331231929699;
// listx holding of treasury after lip005
export const treasuryHoldingShares = 1_100_361_600428; // value from https://stxscan.co/transactions/0xeadfe530ae96a9b78468dc0b5707fa7a40796af9063695d52f3e2571e99b893e
export const treasuryHolding = Math.floor(treasuryHoldingShares / factor); // 1_105_087_316_675;
export const oneMillionHolding = 1_000_000_000_000;
export const oneMillionHoldingAfterRewards = Math.floor(oneMillionHolding / factor);
export const restLiSTXHolding = reserve - alexVaultHolding;

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
    endpoint: 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lqstx-mint-endpoint-v2-01',
    dao: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao',
    boot: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.boot',
    operators: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.operators',
    manager: 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.public-pools-strategy-manager-v2',
    lqstx: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx',
    treasury: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.treasury',
    burnNft: 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.li-stx-burn-nft',
    mintNft: 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.li-stx-mint-nft',
    wstx: '',
    wlqstx: '',
    amm: '',
    lqstxVault: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault',
    alexLegacyDAO: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.executor-dao',
    alexDAO: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.executor-dao',
    alexVault11: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.alex-vault-v1-1',
    oldAlex: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token',
    newAlex: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex',
    autoAlexV2: 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.auto-alex-v2',
  };

  const prepareALEX = () => {
    console.log(`${simnet.deployer}.mock-boot`);
    const result = simnet.mineBlock([
      tx.callPublicFn(
        contracts.autoAlexV2,
        'set-contract-owner',
        [principalCV("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.executor-dao")],
        "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9"
      ),
      tx.callPublicFn(
        contracts.alexLegacyDAO,
        'construct',
        [principalCV(`${simnet.deployer}.legacy-boot`)],
        "SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9"
      ),
      tx.callPublicFn(
        contracts.alexDAO,
        'construct',
        [principalCV(`${simnet.deployer}.alex-boot`)],
        "SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM"
      ),      
      tx.callPublicFn(
        contracts.dao,
        "construct",
        [principalCV(`${simnet.deployer}.mock-boot`)],
        "SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH"
      )
    ]);
    expect(result[0].result).toBeOk(Cl.bool(true));
    expect(result[1].result).toBeOk(Cl.bool(true));
    expect(result[2].result).toBeOk(Cl.bool(true));
    expect(result[3].result).toBeOk(Cl.bool(true));
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
    return result[2];
  };

  const prepareTest = () => {
    simnet.mineBlock([tx.transferSTX(10_000_000_000_000, user, faucet)]);
    simnet.mineBlock([tx.transferSTX(1_000_000_000, manager, faucet)]);
    simnet.mineBlock([
      tx.transferSTX(1_000_000_000, 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP', faucet),
    ]);

    const result1 = simnet.mineBlock([
      tx.callPublicFn(
        contracts.dao,
        'construct',
        [principalCV(contracts.boot)],
        'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH'
      ),
    ]);
    executeLip('SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lip001');

    // Do not mint NFTs because no mint requests were sent so far
    //executeLip('SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lip002');
    executeLip('SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lip003');
    executeLip('SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.lip004');

    // mint shares (=reserve) at 1:1
    const result2 = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'request-mint', [uintCV(shares)], user),
    ]);
    expect(result2[0].result).toBeOk(Cl.uint(1));
    simnet.mineEmptyBlocks(1500);
    const result3 = simnet.mineBlock([
      tx.callPublicFn(contracts.endpoint, 'finalize-mint', [uintCV(1)], user),
      // move shares of alex vault
      tx.callPublicFn(
        contracts.lqstx,
        'transfer',
        [
          uintCV(alexVaultHoldingShares),
          principalCV(user),
          principalCV(contracts.alexVault11),
          noneCV(),
        ],
        user
      ),
      // move shares for 1m STX
      tx.callPublicFn(
        contracts.lqstx,
        'transfer',
        [uintCV(oneMillionHolding), principalCV(user), principalCV(user2), noneCV()],
        user
      ),
    ]);
    expect(result3[0].result).toBeOk(Cl.bool(true));
    expect(result3[1].result).toBeOk(Cl.bool(true));
    expect(result3[2].result).toBeOk(Cl.bool(true));

    let response = simnet.callReadOnlyFn(
      contracts.lqstx,
      'get-balance',
      [principalCV(user2)],
      user
    );
    expect(response.result).toBeOk(Cl.uint(oneMillionHolding));

    const result4 = simnet.mineBlock([
      // add STX to reserve to match the reserve before lip005
      tx.transferSTX(reserve - shares, contracts.lqstxVault, faucet),
      tx.callPublicFn(contracts.endpoint, 'rebase', [], user),
    ]);
    expect(result4[0].result).toBeOk(Cl.bool(true));
    expect(result4[1].result).toBeOk(Cl.uint(reserve));

    // check balance for 1m holder after rewards
    response = simnet.callReadOnlyFn(contracts.lqstx, 'get-balance', [principalCV(user2)], user);
    expect(response.result).toBeOk(Cl.uint(oneMillionHoldingAfterRewards));

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
    executeLip,
    prepareALEX,
    user,
    user2,
    oracle,
    bot,
    manager,
    operator3,
  };
};
