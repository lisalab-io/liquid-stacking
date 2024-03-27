# Liquid Stacking (LISA)

## Notice

Currently, `clarinet check` and the CI fails due to a bug in clarinet. See https://github.com/hirosystems/clarinet/pull/1394 . To check the contracts, you need to build clarinet locally.

## Deployment

1. npm run

## Errors

The LISA protocol contracts each have their own error space. All protocol errors
are in the form `(err uint)` and they are unique across all contracts.

### Error space

| Group         | Error space | Description                                    |
| ------------- | ----------- | ---------------------------------------------- |
| Dao           | 1XXX        | Errors related to the dao.                     |
| Operators     | 1XXX        | Errors related to the operators.               |
| Strategy      | 2XXX        | Errors related to stacking strategy.           |
| Permissions   | 3XXX        | Errors related to governance of the dao.       |
| Token         | 3XXX        | Errors coming directly from the tokens.        |
| Proxy         | 4XXX        | Errors related to proxy contracts.             |
| Pool members  | 5XXX        | Errors related to stacking pool members.       |
| Wrapped token | 6XXX        | Errors coming directly from the wrapped token. |
| Mint Endpoint | 7XXX        | Errors coming directly from the mint endpoint. |
| NFTs          | 8XXX        | Errors coming directly from the NFTs.          |
| Vesting       | 9XXX        | Errors coming directly from vesting.           |
| Pools         | 4XX/5XX/6XX | Errors coming public stacking pools.           |
| Assets        | 1/2/3/4     | Errors coming for native Clarity assets.       |

### Error table

<!--errors-->

| Contract                        | Constant                         | Value       | Description |
| ------------------------------- | -------------------------------- | ----------- | ----------- |
| lisa-dao                        | err-unauthorised                 | (err u1000) |             |
| lqstx-mint-endpoint             | err-unauthorised                 | (err u1000) |             |
| lqstx-mint-endpoint-v1-01       | err-unauthorised                 | (err u1000) |             |
| lqstx-mint-registry             | err-unauthorised                 | (err u1000) |             |
| lqstx-vault                     | err-unauthorised                 | (err u1000) |             |
| operators                       | err-unauthorised                 | (err u1000) |             |
| token-vesting                   | err-unauthorised                 | (err u1000) |             |
| token-wlqstx                    | err-not-authorized               | (err u1000) |             |
| treasury                        | err-unauthorised                 | (err u1000) |             |
| lisa-dao                        | err-already-executed             | (err u1001) |             |
| lqstx-mint-endpoint             | err-paused                       | (err u1001) |             |
| lqstx-mint-endpoint-v1-01       | err-paused                       | (err u1001) |             |
| operators                       | err-not-operator                 | (err u1001) |             |
| lisa-dao                        | err-invalid-extension            | (err u1002) |             |
| operators                       | err-already-signalled            | (err u1002) |             |
| operators                       | err-proposal-expired             | (err u1003) |             |
| operators                       | err-unknown-proposal             | (err u1004) |             |
| operators                       | err-reused-proposal              | (err u1005) |             |
| lqstx-mint-endpoint             | err-request-pending              | (err u1006) |             |
| lqstx-mint-endpoint-v1-01       | err-request-pending              | (err u1006) |             |
| lqstx-mint-endpoint             | err-request-finalized-or-revoked | (err u1007) |             |
| lqstx-mint-endpoint-v1-01       | err-request-finalized-or-revoked | (err u1007) |             |
| lqstx-mint-endpoint             | err-not-whitelisted              | (err u1008) |             |
| lqstx-mint-endpoint-v1-01       | err-not-whitelisted              | (err u1008) |             |
| lqstx-mint-registry             | err-unknown-request-id           | (err u1008) |             |
| public-pools-strategy           | err-not-vault-caller             | (err u2000) |             |
| public-pools-strategy           | err-invalid-payload              | (err u2001) |             |
| endpoint-whitelist-helper-v1-02 | err-unauthorised                 | (err u3000) |             |
| li-stx-burn-nft                 | err-unauthorised                 | (err u3000) |             |
| li-stx-mint-nft                 | err-unauthorised                 | (err u3000) |             |
| lisa-rebase                     | err-unauthorised                 | (err u3000) |             |
| lqstx-mint-endpoint-v1-02       | err-unauthorised                 | (err u3000) |             |
| public-pools-strategy-manager   | err-unauthorised                 | (err u3000) |             |
| token-lisa                      | err-unauthorised                 | (err u3000) |             |
| token-lqstx                     | err-unauthorised                 | (err u3000) |             |
| token-vlqstx                    | err-unauthorised                 | (err u3000) |             |
| token-wlqstx                    | err-transfer-failed              | (err u3000) |             |
| token-lqstx                     | err-invalid-amount               | (err u3001) |             |
| token-lisa                      | err-not-token-owner              | (err u4)    |             |
| lisa-transfer-proxy             | err-invalid-payload              | (err u4000) |             |
| lqstx-transfer-proxy            | err-invalid-payload              | (err u4000) |             |
| stx-transfer-many-proxy         | err-invalid-payload              | (err u4000) |             |
| stx-transfer-proxy              | err-invalid-payload              | (err u4000) |             |
| pox-fast-pool-v2                | err-unauthorized                 | (err u401)  |             |
| pox-fast-pool-v2                | err-forbidden                    | (err u403)  |             |
| pox-pools-1-cycle-v2            | err-not-found                    | (err u404)  |             |
| pox-fast-pool-v2                | err-too-early                    | (err u500)  |             |
| pox-pools-1-cycle-v2            | err-non-positive-amount          | (err u500)  |             |
| fastpool-member1                | err-unauthorised                 | (err u5000) |             |
| fastpool-member10               | err-unauthorised                 | (err u5000) |             |
| fastpool-member2                | err-unauthorised                 | (err u5000) |             |
| fastpool-member3                | err-unauthorised                 | (err u5000) |             |
| fastpool-member4                | err-unauthorised                 | (err u5000) |             |
| fastpool-member5                | err-unauthorised                 | (err u5000) |             |
| fastpool-member6                | err-unauthorised                 | (err u5000) |             |
| fastpool-member7                | err-unauthorised                 | (err u5000) |             |
| fastpool-member8                | err-unauthorised                 | (err u5000) |             |
| fastpool-member9                | err-unauthorised                 | (err u5000) |             |
| xverse-member1                  | err-unauthorised                 | (err u5000) |             |
| xverse-member10                 | err-unauthorised                 | (err u5000) |             |
| xverse-member2                  | err-unauthorised                 | (err u5000) |             |
| xverse-member3                  | err-unauthorised                 | (err u5000) |             |
| xverse-member4                  | err-unauthorised                 | (err u5000) |             |
| xverse-member5                  | err-unauthorised                 | (err u5000) |             |
| xverse-member6                  | err-unauthorised                 | (err u5000) |             |
| xverse-member7                  | err-unauthorised                 | (err u5000) |             |
| xverse-member8                  | err-unauthorised                 | (err u5000) |             |
| xverse-member9                  | err-unauthorised                 | (err u5000) |             |
| pox-pools-1-cycle-v2            | err-no-stacker-info              | (err u501)  |             |
| pox-pools-1-cycle-v2            | err-no-user-info                 | (err u502)  |             |
| pox-fast-pool-v2                | err-decrease-forbidden           | (err u503)  |             |
| pox-pools-1-cycle-v2            | err-decrease-forbidden           | (err u503)  |             |
| pox-fast-pool-v2                | err-pox-address-deactivated      | (err u504)  |             |
| token-wlqstx                    | err-mint-failed                  | (err u6002) |             |
| token-wlqstx                    | err-burn-failed                  | (err u6003) |             |
| token-wlqstx                    | err-not-supported                | (err u6004) |             |
| pox-fast-pool-v2                | err-already-stacking             | (err u603)  |             |
| pox-pools-1-cycle-v2            | err-already-stacking             | (err u603)  |             |
| pox-fast-pool-v2                | err-stacking-permission-denied   | (err u609)  |             |
| pox-pools-1-cycle-v2            | err-stacking-permission-denied   | (err u609)  |             |
| lqstx-mint-endpoint-v1-02       | err-paused                       | (err u7001) |             |
| lqstx-mint-endpoint-v1-02       | err-request-pending              | (err u7006) |             |
| lqstx-mint-endpoint-v1-02       | err-request-finalized-or-revoked | (err u7007) |             |
| lqstx-mint-endpoint-v1-02       | err-not-whitelisted              | (err u7008) |             |
| li-stx-mint-nft                 | err-not-authorized               | (err u8000) |             |
| li-stx-mint-nft                 | err-listing                      | (err u8001) |             |
| li-stx-mint-nft                 | err-wrong-commission             | (err u8002) |             |
| li-stx-mint-nft                 | err-not-found                    | (err u8003) |             |
| li-stx-mint-nft                 | err-metadata-frozen              | (err u8004) |             |
| li-stx-burn-nft                 | err-not-authorized               | (err u8100) |             |
| li-stx-burn-nft                 | err-listing                      | (err u8101) |             |
| li-stx-burn-nft                 | err-wrong-commission             | (err u8102) |             |
| li-stx-burn-nft                 | err-not-found                    | (err u8103) |             |
| li-stx-burn-nft                 | err-metadata-frozen              | (err u8104) |             |
| token-vesting                   | err-caller-not-recipient         | (err u9000) |             |
| token-vesting                   | err-unknown-vesting-id           | (err u9001) |             |
| token-vesting                   | err-event-not-vested             | (err u9002) |             |
| token-vesting                   | err-event-already-claimed        | (err u9003) |             |
| token-vesting                   | err-recipient-exists             | (err u9004) |             |

<!--errors-->

## References
