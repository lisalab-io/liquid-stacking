
;; SPDX-License-Identifier: BUSL-1.1

(define-constant err-unauthorised (err u5000))

(as-contract (contract-call? 'ST000000000000000000002AMW42H.pox-3 allow-contract-caller 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 none))

(define-read-only (is-strategy-caller)
	(ok (asserts! (is-eq contract-caller 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.public-pools-strategy) err-unauthorised))
)

(define-public (delegate-stx (amount uint))
	(begin
		(try! (is-strategy-caller))
		(try! (as-contract (contract-call? 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 delegate-stx amount)))
		(ok true)
	)
)

(define-public (revoke-delegate-stx)
	(begin
		(try! (is-strategy-caller))
		(match (as-contract (contract-call? 'ST000000000000000000002AMW42H.pox-3 revoke-delegate-stx))
			ok-val (ok ok-val)
			err-val (err (to-uint err-val))
		)
	)
)

(define-public (refund-stx (recipient principal))
	(let ((balance (stx-get-balance (as-contract tx-sender))))
		(try! (is-strategy-caller))
		(try! (as-contract (stx-transfer? balance tx-sender recipient)))
		(ok balance)
	)
)

