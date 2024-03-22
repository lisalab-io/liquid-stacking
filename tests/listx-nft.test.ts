// SPDX-License-Identifier: BUSL-1.1

import { Cl } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';
import { createClientMockSetup } from './clients/mock-client';

const { contracts, prepareTest, requestMint, goToNextCycle, liSTXBalance, user, bot } =
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

describe('LiSTX NFT', () => {
  it('user can transfer nft before finalize mint', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    let response = requestMint(100e6);
    expect(response.result).toBeOk(Cl.uint(1));

    // transfer nft to bot
    response = transferMintNFT(1, bot);
    expect(response.result).toBeOk(Cl.bool(true));
    // finalize mint
    goToNextCycle();
    simnet.mineEmptyBlocks(mintDelay);
    simnet.callPublicFn(contracts.rebase1, 'finalize-mint', [Cl.uint(1)], bot);

    // check that bot received liquid stx
    expect(liSTXBalance(user)).toBeUint(0);
    expect(liSTXBalance(bot)).toBeUint(100e6);
  });
});
