// SPDX-License-Identifier: BUSL-1.1

import { Cl, ClarityType, principalCV, stringAsciiCV, tupleCV, uintCV } from '@stacks/transactions';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    alexVaultHoldingShares,
    createClientMockSetup,
    factor,
    oneMillionHolding,
    oneMillionHoldingAfterRewards,
    reserve,
    treasuryHoldingShares,
} from './clients/mock-client';
import { tx } from '@hirosystems/clarinet-sdk';

const { contracts, oracle, user2, bot, operator3, prepareTest, executeLip } = createClientMockSetup();

const ONE_8 = 1e8;
const ACTIVATION_BLOCK = 20;

describe('auto-alex-v3', () => {
    beforeEach(() => {
        prepareTest().map((e: Record<string, unknown>) => expect(e.result).toBeOk(Cl.bool(true)));
    });
    it('auto-alex-v3 : ensure that it works', () => {

        const wallet_1 = oracle;
        const wallet_2 = bot;
        const wallet_3 = user2;
        const wallet_4 = operator3;
        const dx = ONE_8;
        const end_cycle = 32;

        let responses = simnet.mineBlock([
            tx.callPublicFn(
                contracts.oldAlex,
                'mint-fixed',
                [
                    Cl.uint(dx),
                    Cl.principal(wallet_1.address)
                ],
                simnet.deployer),
            tx.callPublicFn(
                contracts.oldAlex,
                'mint-fixed',
                [
                    Cl.uint(dx),
                    Cl.principal(wallet_2.address)
                ],
                simnet.deployer),
            tx.callPublicFn(
                contracts.oldAlex,
                'mint-fixed',
                [
                    Cl.uint(dx),
                    Cl.principal(wallet_3.address)
                ],
                simnet.deployer),
            tx.callPublicFn(
                contracts.oldAlex,
                'mint-fixed',
                [
                    Cl.uint(dx),
                    Cl.principal(wallet_4.address)
                ],
                simnet.deployer),
        ]);
        responses.map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));
    });
}

    //     let block = chain.mineBlock([
    //         Tx.contractCall(
    //             "alex-vault",
    //             "add-approved-token",
    //             [types.principal(alexTokenAddress)],
    //             deployer.address
    //         ),
    //         reservePool.addToken(deployer, alexTokenAddress),
    //         reservePool.setActivationBlock(
    //             deployer,
    //             alexTokenAddress,
    //             ACTIVATION_BLOCK
    //         ),
    //         reservePool.setCoinbaseAmount(
    //             deployer,
    //             alexTokenAddress,
    //             1e8,
    //             1e8,
    //             1e8,
    //             1e8,
    //             1e8
    //         ),
    //         yieldVault.setStartCycle(deployer, 0),
    //         yieldVault.setBountyInFixed(deployer, 1),
    //         Tx.contractCall('auto-alex-v2', 'pause-create', [types.bool(false)], deployer.address),
    //         Tx.contractCall('auto-alex-v2', 'pause-redeem', [types.bool(false)], deployer.address)
    //     ]);
    //     block.receipts.forEach((e) => { e.result.expectOk() });

    //     block = chain.mineBlock([
    //         yieldVault.setEndCycle(wallet_1, end_cycle),
    //         yieldVault.setEndCycle(deployer, end_cycle),
    //         Tx.contractCall('auto-alex-v3-2', 'set-approved-contract', [types.principal(deployer.address + '.auto-alex-v3-2-endpoint'), types.bool(true)], deployer.address),
    //         Tx.contractCall('auto-alex-v3-2-registry', 'set-approved-contract', [types.principal(deployer.address + '.auto-alex-v3-2-endpoint'), types.bool(true)], deployer.address),
    //         Tx.contractCall('auto-alex-v3-2-registry', 'set-start-cycle', [types.uint(0)], deployer.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'pause-create', [types.bool(false)], deployer.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'pause-redeem', [types.bool(false)], deployer.address)
    //     ]);
    //     block.receipts[0].result.expectErr().expectUint(1000);
    //     block.receipts[1].result.expectOk();
    //     block.receipts[2].result.expectOk();
    //     block.receipts[3].result.expectOk();
    //     block.receipts[4].result.expectOk();

    //     if (chain.blockHeight < ACTIVATION_BLOCK) {
    //         chain.mineEmptyBlockUntil(ACTIVATION_BLOCK);
    //     }

    //     block = chain.mineBlock([
    //         yieldVault.addToPosition(wallet_1, dx),
    //         // Tx.contractCall('auto-alex-v3-2-endpoint', 'add-to-position', [types.uint(dx)], wallet_1.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'add-to-position', [types.uint(dx)], wallet_2.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'add-to-position', [types.uint(dx)], wallet_3.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'add-to-position', [types.uint(dx)], wallet_4.address),
    //     ]);
    //     block.receipts.forEach((e) => { e.result.expectOk() });

    //     chain.mineEmptyBlockUntil(ACTIVATION_BLOCK + 2 * 525);

    //     block = chain.mineBlock([
    //         Tx.contractCall('age000-governance-token', 'mint-fixed', [types.uint(3), types.principal(deployer.address + ".auto-alex-v2")], deployer.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'rebase', [], deployer.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'upgrade', [types.uint(dx)], wallet_1.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'request-redeem', [types.uint(dx)], wallet_1.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'request-redeem', [types.uint(dx)], wallet_2.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'request-redeem', [types.uint(dx)], wallet_3.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'request-redeem', [types.uint(dx)], wallet_4.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'revoke-redeem', [types.uint(4)], wallet_4.address),
    //     ]);
    //     // console.log(block.receipts[3].events);
    //     block.receipts.forEach(e => { e.result.expectOk() });

    //     const redeem_cycle = end_cycle + 2;

    //     for (let cycle = 2; cycle < redeem_cycle; cycle++) {
    //         chain.mineEmptyBlockUntil(ACTIVATION_BLOCK + (cycle + 1) * 525);
    //         block = chain.mineBlock([
    //             Tx.contractCall('age000-governance-token', 'mint-fixed', [types.uint(3), types.principal(deployer.address + ".auto-alex-v2")], deployer.address),
    //             Tx.contractCall('auto-alex-v3-2-endpoint', 'rebase', [], deployer.address),
    //             Tx.contractCall('auto-alex-v3-2-endpoint', 'finalize-redeem', [types.uint(2)], wallet_2.address),
    //         ]);
    //         console.log(block.receipts[1].events);
    //         block.receipts[1].result.expectOk();
    //         block.receipts[2].result.expectErr(10018);
    //     }

    //     chain.mineEmptyBlockUntil(ACTIVATION_BLOCK + (redeem_cycle + 1) * 525);

    //     console.log(chain.callReadOnlyFn('age000-governance-token', 'get-balance-fixed', [types.principal(deployer.address + '.auto-alex-v3-2')], wallet_1.address));
    //     console.log(chain.callReadOnlyFn('auto-alex-v3-2-endpoint', 'get-intrinsic', [], wallet_1.address));
    //     console.log(chain.callReadOnlyFn('auto-alex-v3-2-endpoint', 'get-shares-to-tokens-per-cycle-or-default', [types.uint(redeem_cycle - 1)], wallet_1.address));

    //     block = chain.mineBlock([
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'rebase', [], deployer.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'revoke-redeem', [types.uint(3)], wallet_3.address),
    //     ]);
    //     console.log(block.receipts[0].events);
    //     block.receipts[0].result.expectOk();
    //     block.receipts[1].result.expectErr(10019);

    //     console.log(chain.callReadOnlyFn('auto-alex-v3-2-endpoint', 'get-redeem-request-or-fail', [types.uint(2)], wallet_1.address).result);
    //     console.log(chain.callReadOnlyFn('auto-alex-v3-2-endpoint', 'get-redeem-request-or-fail', [types.uint(3)], wallet_1.address).result);
    //     console.log(chain.callReadOnlyFn('age000-governance-token', 'get-balance-fixed', [types.principal(deployer.address + '.auto-alex-v3-2')], wallet_1.address));
    //     console.log(chain.callReadOnlyFn('auto-alex-v3-2-endpoint', 'get-intrinsic', [], wallet_1.address));
    //     console.log(chain.callReadOnlyFn('auto-alex-v3-2-endpoint', 'get-shares-to-tokens-per-cycle-or-default', [types.uint(redeem_cycle)], wallet_1.address));

    //     block = chain.mineBlock([
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'finalize-redeem', [types.uint(3)], wallet_3.address),
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'finalize-redeem', [types.uint(2)], wallet_2.address),
    //     ]);
    //     console.log(block.receipts[0].events);
    //     console.log(block.receipts[1].events);
    //     block.receipts.forEach(e => { e.result.expectOk() });

    //     block = chain.mineBlock([
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'finalize-redeem', [types.uint(1)], wallet_1.address),
    //     ]);
    //     console.log(block.receipts[0].events);
    //     block.receipts.forEach(e => { e.result.expectOk() });

    //     block = chain.mineBlock([
    //         Tx.contractCall('auto-alex-v3-2-endpoint', 'finalize-redeem', [types.uint(2)], wallet_2.address),
    //     ]);
    //     block.receipts[0].result.expectErr(10020);
    // },
});