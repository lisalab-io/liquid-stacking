import { Cl, ClarityType, cvToString } from '@stacks/transactions';
import { expect, it } from 'vitest';

export const sip10Tests = (contract: string) => {
  const accounts = simnet.getAccounts();
  const alice = accounts.get('wallet_1')!;
  const bob = accounts.get('wallet_2')!;

  it('owner can transfer', () => {
    let response = simnet.callPublicFn(
      contract,
      'transfer',
      [Cl.uint(1), Cl.standardPrincipal(alice), Cl.standardPrincipal(bob), Cl.none()],
      alice
    );
    console.log('transfer', cvToString(response.result));
    expect(response.result).toBeOk(Cl.bool(true));
  });

  it('owner cannot transfer to owner', () => {
    let response = simnet.callPublicFn(
      contract,
      'transfer',
      [Cl.uint(1), Cl.standardPrincipal(alice), Cl.standardPrincipal(alice), Cl.none()],
      alice
    );
    expect(response.result).toHaveClarityType(ClarityType.ResponseErr);
  });
};
