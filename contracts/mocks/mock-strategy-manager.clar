
;; SPDX-License-Identifier: BUSL-1.1

(define-constant err-unauthorised (err u1000))

(define-map authorised-managers principal bool)
(map-set authorised-managers tx-sender true)

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao) (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-read-only (is-authorised-manager (who principal))
	(default-to false (map-get? authorised-managers who))
)

(define-public (fund-strategy (amount uint))
	(begin
		(asserts! (is-authorised-manager tx-sender) err-unauthorised)
		(as-contract (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault fund-strategy .mock-strategy (contract-call? .mock-strategy create-payload amount)))
	)
)

(define-public (refund-strategy (amount uint))
	(begin
		(asserts! (is-authorised-manager tx-sender) err-unauthorised)
		(as-contract (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault refund-strategy .mock-strategy (contract-call? .mock-strategy create-payload amount)))
	)
)

(define-public (set-authorised-manager (who principal) (enabled bool))
	(begin
		(try! (is-dao-or-extension))
		(ok (map-set authorised-managers who enabled))
	)
)
