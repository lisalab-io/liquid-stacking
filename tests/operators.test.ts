// SPDX-License-Identifier: BUSL-1.1

import { ParsedTransactionResult, tx } from '@hirosystems/clarinet-sdk';
import { BooleanCV, Cl, IntCV, SomeCV, TupleCV, UIntCV } from '@stacks/transactions';
import { describe, expect, it } from 'vitest';
import { createClientMockSetup } from './clients/mock-client';

const { contracts, prepareTest, bot, manager, operator3 } = createClientMockSetup();

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
      // signal from non-operator fails with unauthorized
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(true)],
        bot
      ),
      // second signal from 1st operator fails with double signal error
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(true)],
        simnet.deployer
      ),
      // signal from 2nd operator
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(true)],
        manager
      ),
      // 2nd signal from 2nd operator fails as proposal expired
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(true)],
        manager
      ),
    ]);
    expect(responses[0].result).toBeErr(Cl.uint(1001));
    expect(responses[1].result).toBeErr(Cl.uint(1002)); // err-already-signalled
    expect(responses[2].result).toBeOk(Cl.bool(true));
    expect(responses[3].result).toBeErr(Cl.uint(1003)); // err-proposal-expired
  });

  it('contra operator out-weighs two pro operators', () => {
    prepareTest().map((e: any) => expect(e.result).toBeOk(Cl.bool(true)));

    let response;
    response = simnet.callPublicFn(
      contracts.operators,
      'propose',
      [Cl.contractPrincipal(simnet.deployer, contracts.proposal)],
      simnet.deployer
    );
    expect(response.result).toBeOk(Cl.bool(false));

    let responses = simnet.mineBlock([
      // signal from 2nd operator against proposal
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(false)],
        manager
      ),
      // signal from 3nd operator for proposal
      tx.callPublicFn(
        contracts.operators,
        'signal',
        [Cl.contractPrincipal(simnet.deployer, contracts.proposal), Cl.bool(true)],
        operator3
      ),
    ]);
    expect(responses[0].result).toBeOk(Cl.bool(false));
    expect(responses[1].result).toBeOk(Cl.bool(false));
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
