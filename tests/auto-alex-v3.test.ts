// SPDX-License-Identifier: BUSL-1.1

import { Cl, ClarityType } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    createClientMockSetup
} from './clients/mock-client';
import { tx } from '@hirosystems/clarinet-sdk';

const { contracts, oracle, user2, bot, operator3, prepareALEX } = createClientMockSetup();

describe('auto-alex-v3', () => {
    it('auto-alex-v3 : ensure that it works', () => {

        const wallet_1 = oracle;
        const wallet_2 = bot;
        const wallet_3 = user2;
        const wallet_4 = operator3;
        const dx = 1e8;
        const end_cycle = 32;
        const ACTIVATION_BLOCK = 20;

        prepareALEX();        

        if (simnet.blockHeight < ACTIVATION_BLOCK) {
            simnet.mineEmptyBlocks(ACTIVATION_BLOCK - simnet.blockHeight);
        }

        // add some legacy auto-alex-v2 position and new auto-alex-v3 positions.
        let response = simnet.mineBlock([
            // tx.callPublicFn(contracts.autoAlexV2, "add-to-position", [Cl.uint(dx)], wallet_1),
            tx.callPublicFn("auto-alex-v3-endpoint", "add-to-position", [Cl.uint(dx)], wallet_1),
            tx.callPublicFn("auto-alex-v3-endpoint", "add-to-position", [Cl.uint(dx)], wallet_2),
            tx.callPublicFn("auto-alex-v3-endpoint", "add-to-position", [Cl.uint(dx)], wallet_3),
            tx.callPublicFn("auto-alex-v3-endpoint", "add-to-position", [Cl.uint(dx)], wallet_4)
        ]);
        response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));

        // move a few (2) cycles
        simnet.mineEmptyBlocks(ACTIVATION_BLOCK + 2 * 525 - simnet.blockHeight);
        
        response = simnet.mineBlock([
            // this fixes a minor bug in auto-alex-v2 that bounty must be greater than 0
            tx.callPublicFn(contracts.oldAlex, 'mint-fixed', [Cl.uint(3), Cl.principal(contracts.autoAlexV2)], simnet.deployer),
            // rebase the lialex
            // tx.callPublicFn('auto-alex-v3-endpoint', 'rebase', [], simnet.deployer),
            // upgrade legacy auto-alex-v2 to v3
            // tx.callPublicFn('auto-alex-v3-endpoint', 'upgrade', [Cl.uint(dx)], wallet_1),
            // test redeems
            tx.callPublicFn('auto-alex-v3-endpoint', 'request-redeem', [Cl.uint(dx)], wallet_1),
            tx.callPublicFn('auto-alex-v3-endpoint', 'request-redeem', [Cl.uint(dx)], wallet_2),
            tx.callPublicFn('auto-alex-v3-endpoint', 'request-redeem', [Cl.uint(dx)], wallet_4),
            // test revoke redeem request
            tx.callPublicFn('auto-alex-v3-endpoint', 'revoke-redeem', [Cl.uint(3)], wallet_4),
        ]);
        response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));

        // console.log(`current block: ${simnet.blockHeight}`);
        // console.log(`current cycle: ${simnet.callReadOnlyFn("SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2", "get-reward-cycle", [Cl.uint(simnet.blockHeight)], wallet_1).result.value.value}`);

        const redeem_cycle = end_cycle + 2;

        for (let cycle = 2; cycle < redeem_cycle; cycle++) {
            simnet.mineEmptyBlocks(ACTIVATION_BLOCK + (cycle + 1) * 525 - simnet.blockHeight);
            // console.log(`current block: ${simnet.blockHeight}`);
            // console.log(`current cycle: ${simnet.callReadOnlyFn("SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2", "get-reward-cycle", [Cl.uint(simnet.blockHeight)], wallet_1).result.value.value}`);
            // console.log(`alex-vault bal: ${simnet.callReadOnlyFn("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token", "get-balance-fixed", [Cl.principal("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.alex-vault")], wallet_1).result.value.value}`);
            // console.log(`auto-alex-v2 bal: ${simnet.callReadOnlyFn("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token", "get-balance-fixed", [Cl.principal("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.auto-alex-v2")], wallet_1).result.value.value}`);
            // console.log(`redeem: ${simnet.callReadOnlyFn('auto-alex-v3-endpoint', 'get-redeem-request-or-fail', [Cl.uint(2)], wallet_1).result.value.data.amount.value}`);
            response = simnet.mineBlock([
                tx.callPublicFn(contracts.oldAlex, 'mint-fixed', [Cl.uint(3), Cl.principal(contracts.autoAlexV2)], simnet.deployer),
                tx.callPublicFn('auto-alex-v3-endpoint', 'rebase', [], simnet.deployer),
                // you cannot finalize redeem until end cycle
                tx.callPublicFn('auto-alex-v3-endpoint', 'finalize-redeem', [Cl.uint(2)], wallet_2),
            ]);

            // console.log(response[0].events);
            expect(response[0].result).toHaveClarityType(ClarityType.ResponseOk);
            expect(response[1].result).toHaveClarityType(ClarityType.ResponseOk);
            expect(response[2].result).toBeErr(Cl.uint(10017));
            if(cycle == 3){
                response = simnet.mineBlock([
                    tx.callPublicFn('auto-alex-v3-endpoint', 'request-redeem', [Cl.uint(dx)], wallet_3),                    
                ]);
                expect(response[0].result).toHaveClarityType(ClarityType.ResponseOk);
            }
        }

        simnet.mineEmptyBlocks(ACTIVATION_BLOCK + (redeem_cycle + 1) * 525 - simnet.blockHeight);

        // console.log(simnet.callReadOnlyFn(contracts.oldAlex, 'get-balance-fixed', [Cl.principal(simnet.deployer + '.auto-alex-v3')], wallet_1));
        // console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint', 'get-intrinsic', [], wallet_1));
        // console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint', 'get-shares-to-tokens-per-cycle-or-default', [Cl.uint(redeem_cycle - 1)], wallet_1));

        response = simnet.mineBlock([
            tx.callPublicFn('auto-alex-v3-endpoint', 'rebase', [], simnet.deployer),
            // you cannot revoke after end_cycle
            tx.callPublicFn('auto-alex-v3-endpoint', 'revoke-redeem', [Cl.uint(2)], wallet_3),
        ]);
        // console.log(response[0].events);
        expect(response[0].result).toHaveClarityType(ClarityType.ResponseOk);
        expect(response[1].result).toBeErr(Cl.uint(10019));

        console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint', 'get-redeem-request-or-fail', [Cl.uint(2)], wallet_1).result);
        console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint', 'get-redeem-request-or-fail', [Cl.uint(3)], wallet_1).result);
        console.log(simnet.callReadOnlyFn(contracts.oldAlex, 'get-balance-fixed', [Cl.principal(simnet.deployer + '.auto-alex-v3')], wallet_1));
        console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint', 'get-intrinsic', [], wallet_1));
        console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint', 'get-shares-to-tokens-per-cycle-or-default', [Cl.uint(redeem_cycle)], wallet_1));
        console.log(simnet.callReadOnlyFn('auto-alex-v3', 'get-tokens-to-shares', [Cl.uint(1e8)], wallet_1));

        response = simnet.mineBlock([
            // finalize redeem works
            tx.callPublicFn('auto-alex-v3-endpoint', 'finalize-redeem', [Cl.uint(4)], wallet_3),
            tx.callPublicFn('auto-alex-v3-endpoint', 'finalize-redeem', [Cl.uint(2)], wallet_2),
        ]);
        console.log(response[0].events);
        console.log(response[1].events);
        // response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));
        expect(response[0].result).toBeErr(Cl.uint(10017));
        expect(response[1].result).toHaveClarityType(ClarityType.ResponseOk);

        response = simnet.mineBlock([
            // auto-alex-v2 upgrade redeem works
            tx.callPublicFn('auto-alex-v3-endpoint', 'finalize-redeem', [Cl.uint(1)], wallet_1),
        ]);
        console.log(response[0].events);
        response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));

        response = simnet.mineBlock([
            // what was already redeemded cannot be redeemed
            tx.callPublicFn('auto-alex-v3-endpoint', 'finalize-redeem', [Cl.uint(2)], wallet_2),
        ]);
        expect(response[0].result).toBeErr(Cl.uint(10020));

        simnet.mineEmptyBlocks(ACTIVATION_BLOCK + (redeem_cycle + 2) * 525 - simnet.blockHeight);
        response = simnet.mineBlock([
            tx.callPublicFn('auto-alex-v3-endpoint', 'rebase', [], simnet.deployer),
        ]);

        simnet.mineEmptyBlocks(ACTIVATION_BLOCK + (redeem_cycle + 3) * 525 - simnet.blockHeight);
        response = simnet.mineBlock([
            // finalize redeem works
            tx.callPublicFn('auto-alex-v3-endpoint', 'finalize-redeem', [Cl.uint(4)], wallet_3),
        ]);
        console.log(response[0].events);
        response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));
    });
});