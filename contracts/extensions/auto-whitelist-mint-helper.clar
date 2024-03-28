
;; SPDX-License-Identifier: BUSL-1.1

;; TODO: select snapshot heights
(define-constant stacks-snapshot-height1 block-height)
(define-constant stacks-snapshot-height2 block-height)

;; TODO: set pox addresses
(define-constant fastpool-pox-address { version: 0x00, hashbytes: 0x00 })
(define-constant xverse-pox-address { version: 0x00, hashbytes: 0x00 })

(define-read-only (is-eligible-pox-address (pox-address { version: (buff 1), hashbytes: (buff 32) }))
	(or (is-eq pox-address fastpool-pox-address) (is-eq pox-address xverse-pox-address))
)

(define-read-only (is-whitelisted (who principal))
	(contract-call? .lqstx-mint-endpoint-v1-02 is-whitelisted-or-mint-for-all who)
)

(define-private (set-whitelisted (who principal))
	(contract-call? .lqstx-mint-endpoint-v1-02 set-whitelisted who true)
)

(define-read-only (was-stacking-in-eligible-pool-height (who principal) (height uint))
	(at-block (unwrap! (get-block-info? id-header-hash height) false)
		(is-eligible-pox-address (get pox-addr (unwrap! (contract-call? 'SP000000000000000000002Q6VF78.pox-3 get-stacker-info who) false)))
	)
)

(define-read-only (was-stacking-in-eligible-pool (who principal))
	(or
		(was-stacking-in-eligible-pool-height who stacks-snapshot-height1)
		(was-stacking-in-eligible-pool-height who stacks-snapshot-height2)
	)
)

(define-public (request-mint (amount uint))
	(begin
		(and
			(not (is-whitelisted tx-sender))
			(was-stacking-in-eligible-pool tx-sender)
			(try! (set-whitelisted tx-sender))
		)
		(contract-call? .lqstx-mint-endpoint-v1-02 request-mint amount)
	)
)
