
// SPDX-License-Identifier: BUSL-1.1

import { ParsedTransactionResult, tx } from '@hirosystems/clarinet-sdk';
import { BooleanCV, Cl, IntCV, SomeCV, TupleCV, UIntCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';

const accounts = simnet.getAccounts();
const user = accounts.get('wallet_1')!;
const oracle = accounts.get('wallet_2')!;
const bot = accounts.get('wallet_3')!;
const manager = accounts.get('wallet_4')!;

const contracts = {
  endpoint: 'lqstx-mint-endpoint-v1-01',
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
  proposal: 'mock-proposal',
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
const expectProposalDataToBe = (proposedAt: number, signals: number, executed: boolean) => {
  const proposalData = simnet.getMapEntry(
    contracts.operators,
    'proposals',
    Cl.contractPrincipal(simnet.deployer, contracts.proposal)
  ) as SomeCV<TupleCV<{ 'proposed-at': UIntCV; signals: IntCV; executed: BooleanCV }>>;
  expect(proposalData.value).toStrictEqual(
    Cl.tuple({
      'proposed-at': Cl.uint(proposedAt),
      signals: Cl.int(signals),
      executed: Cl.bool(executed),
    })
  );
};

describe('operators contract', () => {
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
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(1001));
    expect(responses[1].result).toBeOk(Cl.bool(false));

    responses = simnet.mineBlock([
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
        manager
      ),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(1001));
    expect(responses[1].result).toBeOk(Cl.bool(true));
  });

  it('signals should be reset when reproposed', () => {
    prepareTest().map((e: ParsedTransactionResult) => expect(e.result).toBeOk(Cl.bool(true)));

    let responses = simnet.mineBlock([
      tx.callPublicFn(
        contracts.operators,
        'propose',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal)],
        simnet.deployer
      ),
      tx.callPublicFn(
        contracts.operators,
        'propose',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal)],
        simnet.deployer
      ),
    ]);
    expect(responses[0].result).toBeOk(Cl.bool(false));
    expect(responses[1].result).toBeErr(Cl.uint(1005));
    expectProposalDataToBe(4, 1, false);

    let responses2 = simnet.mineBlock([
      tx.callPublicFn(
        contracts.operators,
        'propose',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal)],
        simnet.deployer
      ),
    ]);
    expect(responses2[0].result).toBeErr(Cl.uint(1005)); // not yet expired

    simnet.mineEmptyBlocks(143);
    let responses3 = simnet.mineBlock([
      tx.callPublicFn(
        contracts.operators,
        'propose',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal)],
        simnet.deployer
      ),
    ]);
    expect(responses3[0].result).toBeOk(Cl.bool(false));

    expectProposalDataToBe(149, 1, false);
  });
});
