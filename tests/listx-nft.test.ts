// SPDX-License-Identifier: BUSL-1.1

import { Cl } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';
import { createClientMockSetup } from './clients/mock-client';

const { contracts, prepareTest, requestMint, requestBurn, goToNextCycle, liSTXBalance, user, bot } =
  createClientMockSetup();

const mintDelay = 14;

const transferMintNFT = (nftId: number, account: string) => {
  return simnet.callPublicFn(
    contracts.mintNft,
    'transfer',
    [Cl.uint(nftId), Cl.standardPrincipal(user), Cl.standardPrincipal(account)],
    user
  );
};

const transferBurnNFT = (nftId: number, account: string) => {
  return simnet.callPublicFn(
    contracts.burnNft,
    'transfer',
    [Cl.uint(nftId), Cl.standardPrincipal(user), Cl.standardPrincipal(account)],
    user
  );
};

describe('LiSTX NFT', () => {
  it('user can transfer nft before finalize mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    let response = requestMint(100e6);
    console.log(response.events);
    expect(response.result).toBeOk(Cl.uint(1));

    // transfer nft to bot
    response = transferMintNFT(1, bot);
    expect(response.result).toBeOk(Cl.bool(true));
    // finalize mint
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);
    simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot);

    // check that bot received liquid stx
    expect(liSTXBalance(user)).toBeUint(0);
    expect(liSTXBalance(bot)).toBeUint(100e6);
  });

  it('new owner can revoke mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    let response = requestMint(100e6);
    expect(response.result).toBeOk(Cl.uint(1));

    // transfer nft to bot
    response = transferMintNFT(1, bot);
    expect(response.result).toBeOk(Cl.bool(true));

    response = simnet.callPublicFn(contracts.endpoint, 'revoke-mint', [Cl.uint(1)], bot);
    expect(response.result).toBeOk(Cl.bool(true));

    // check that bot received stx
    expect(simnet.getAssetsMap().get('STX')?.get(bot)).toBe(100000100000000n);
    expect(simnet.getAssetsMap().get('STX')?.get(user)).toBe(99999900000000n);
  });

  it('there is no burn nft when liquid token is burnt immediately', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    let response;

    // request and finalize mint
    response = requestMint(100e6);
    expect(response.result).toBeOk(Cl.uint(1));
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);
    response = simnet.callPublicFn(contracts.endpoint, 'finalize-mint', [Cl.uint(1)], bot);
    expect(response.result).toBeOk(Cl.bool(true));

    // request burn
    response = requestBurn(60e6);
    expect(response.result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(1), status: Cl.bufferFromHex('01') })
    );
    response = requestBurn(40e6);
    expect(response.result).toBeOk(
      Cl.tuple({ 'request-id': Cl.uint(2), status: Cl.bufferFromHex('01') })
    );
    // nfts were never minted
    expect(simnet.callReadOnlyFn(contracts.burnNft, 'get-owner', [Cl.uint(1)], user).result).toBeOk(
      Cl.none()
    );
    expect(simnet.callReadOnlyFn(contracts.burnNft, 'get-owner', [Cl.uint(2)], user).result).toBeOk(
      Cl.none()
    );
    expect(simnet.callReadOnlyFn(contracts.burnNft, 'get-last-token-id', [], user).result).toBeOk(
      Cl.uint(0)
    );

    // check that bot received stx
    expect(simnet.getAssetsMap().get('STX')?.get(bot)).toBe(100000000000000n);
    expect(simnet.getAssetsMap().get('STX')?.get(user)).toBe(100000000000000n);
  });
});
