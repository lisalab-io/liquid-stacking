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
            tx.callPublicFn(contracts.autoAlexV2, "add-to-position", [Cl.uint(dx)], wallet_1),
            // tx.callPublicFn("auto-alex-v3-endpoint-v2", "add-to-position", [Cl.uint(dx)], wallet_1),
            tx.callPublicFn("auto-alex-v3-endpoint-v2", "add-to-position", [Cl.uint(dx)], wallet_2),
            tx.callPublicFn("auto-alex-v3-endpoint-v2", "add-to-position", [Cl.uint(dx)], wallet_3),
            tx.callPublicFn("auto-alex-v3-endpoint-v2", "add-to-position", [Cl.uint(dx)], wallet_4),
            tx.callPublicFn('auto-alex-v3-endpoint-v2', 'rebase', [], simnet.deployer),
        ]);
        response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));

        const redeem_cycle = end_cycle + 2;

        for (let cycle = 0; cycle < redeem_cycle + 10; cycle++) {
            simnet.mineEmptyBlocks(ACTIVATION_BLOCK + (cycle + 1) * 525 - simnet.blockHeight);
            // console.log(`current block: ${simnet.blockHeight}`);
            // console.log(`current cycle: ${simnet.callReadOnlyFn("SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2", "get-reward-cycle", [Cl.uint(simnet.blockHeight)], wallet_1).result.value.value}`);
            // console.log(`alex-vault bal: ${simnet.callReadOnlyFn("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token", "get-balance-fixed", [Cl.principal("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.alex-vault")], wallet_1).result.value.value}`);
            // console.log(`auto-alex-v2 bal: ${simnet.callReadOnlyFn("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token", "get-balance-fixed", [Cl.principal("SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.auto-alex-v2")], wallet_1).result.value.value}`);
            // console.log(`redeem: ${simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-redeem-request-or-fail', [Cl.uint(2)], wallet_1).result.value.data.amount.value}`);           

            if (cycle > 1) {
                console.log('cycle', cycle);
                // console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-reward-cycle', [Cl.uint(simnet.blockHeight)], wallet_1).result);
                // console.log(simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-user-id', [], wallet_1).result);
                console.log('redeem-shares', simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-redeem-shares-per-cycle-or-default', [Cl.uint(cycle)], wallet_1).result.value);
                console.log('prev-shares-to-token', simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-shares-to-tokens-per-cycle-or-default', [Cl.uint(Math.max(cycle - 1, 0))], wallet_1).result.value);
                console.log('base-shares-to-token', simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-shares-to-tokens-per-cycle-or-default', [Cl.uint(Math.max(cycle - 33, 0))], wallet_1).result.value);
                // console.log('reward', simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-staking-reward', [Cl.uint(cycle)], wallet_1).result.value);
                console.log('staked', simnet.callReadOnlyFn('auto-alex-v3-endpoint-v2', 'get-staker-at-cycle', [Cl.uint(cycle)], wallet_1).result.data);
                // console.log('total staked', simnet.callReadOnlyFn('SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2', 'get-staking-stats-at-cycle-or-default', [Cl.uint(cycle)], wallet_1).result);
                // console.log('coinbase', simnet.callReadOnlyFn('SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2', 'get-coinbase-amount-or-default', [Cl.uint(cycle)], wallet_1).result);
                // console.log('balance', simnet.callReadOnlyFn('SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex', 'get-balance', [Cl.principal(simnet.deployer + '.auto-alex-v3')], wallet_1).result);
                // console.log('balance', simnet.callReadOnlyFn('SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.age000-governance-token', 'get-balance', [Cl.principal(simnet.deployer + '.auto-alex-v3')], wallet_1).result);
            }   

            response = simnet.mineBlock([
                tx.callPublicFn(contracts.oldAlex, 'mint-fixed', [Cl.uint(3), Cl.principal(contracts.autoAlexV2)], simnet.deployer),
                tx.callPublicFn('auto-alex-v3-endpoint-v2', 'rebase', [], simnet.deployer)
            ]);
            expect(response[0].result).toHaveClarityType(ClarityType.ResponseOk);
            expect(response[1].result).toHaveClarityType(ClarityType.ResponseOk);          

            if (cycle == 2) {
                response = simnet.mineBlock([
                    // this fixes a minor bug in auto-alex-v2 that bounty must be greater than 0
                    tx.callPublicFn(contracts.oldAlex, 'mint-fixed', [Cl.uint(3), Cl.principal(contracts.autoAlexV2)], simnet.deployer),
                    // upgrade legacy auto-alex-v2 to v3
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'upgrade', [Cl.uint(dx)], wallet_1),
                    // test redeems
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'request-redeem', [Cl.uint(dx)], wallet_1),
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'request-redeem', [Cl.uint(dx)], wallet_2),
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'request-redeem', [Cl.uint(dx)], wallet_4),
                    // test revoke redeem request
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'revoke-redeem', [Cl.uint(3)], wallet_4),
                ]);
                response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));
            }

            if (cycle >= 2 && cycle < redeem_cycle + 1) {
                response = simnet.mineBlock([
                    // you cannot finalize redeem until end cycle
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'finalize-redeem', [Cl.uint(2)], wallet_2),
                ]);
                expect(response[0].result).toBeErr(Cl.uint(10017));
            }

            if (cycle == 3) {
                response = simnet.mineBlock([
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'request-redeem', [Cl.uint(dx)], wallet_3),
                ]);
                expect(response[0].result).toHaveClarityType(ClarityType.ResponseOk);
            }

            if (cycle == redeem_cycle + 1) {
                response = simnet.mineBlock([
                    // you cannot revoke after end_cycle
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'revoke-redeem', [Cl.uint(2)], wallet_3),
                    // cannot finalize yet
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'finalize-redeem', [Cl.uint(4)], wallet_3),
                    // finalize redeem works                    
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'finalize-redeem', [Cl.uint(2)], wallet_2),
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'finalize-redeem', [Cl.uint(1)], wallet_1),
                    // cannot finalize again
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'finalize-redeem', [Cl.uint(2)], wallet_2),
                ]);
                expect(response[0].result).toBeErr(Cl.uint(10019));
                expect(response[1].result).toBeErr(Cl.uint(10017));
                expect(response[2].result).toHaveClarityType(ClarityType.ResponseOk);
                expect(response[3].result).toHaveClarityType(ClarityType.ResponseOk);
                expect(response[4].result).toBeErr(Cl.uint(10020));
            }

            if (cycle == redeem_cycle + 2) {
                response = simnet.mineBlock([
                    // finalize redeem works
                    tx.callPublicFn('auto-alex-v3-endpoint-v2', 'finalize-redeem', [Cl.uint(4)], wallet_3),
                ]);
                response.map((e: any) => expect(e.result).toHaveClarityType(ClarityType.ResponseOk));
            }           
        }

    });
});