(define-constant err-unauthorised (err u5000))
(define-constant pool-reward-pox-addr (tuple (hashbytes 0x) (version 0x)))
(as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-3 allow-contract-caller 'SP001SFSMC2ZY76PD4M68P3WGX154XCH7NE3TYMX.pox-pools-1-cycle-v2 none))

(define-read-only (is-strategy-caller)
	(ok (asserts! (is-eq contract-caller .stacking-pool-strategy) err-unauthorised))
)

(define-public (delegate-stx (amount uint))
	(begin
		(try! (is-strategy-caller))
		(try! (as-contract (contract-call? 'SP001SFSMC2ZY76PD4M68P3WGX154XCH7NE3TYMX.pox-pools-1-cycle-v2 delegate-stx 
			amount 
			'SPXVRSEH2BKSXAEJ00F1BY562P45D5ERPSKR4Q33 none (some (tuple (hashbytes 0xdb14133a9dbb1d0e16b60513453e48b6ff2847a9) (version 0x04)))
			pool-reward-pox-addr
			none)))
		(ok true)
	)
)

(define-public (revoke-delegate-stx)
	(begin
		(try! (is-strategy-caller))
		(match (as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-3 revoke-delegate-stx))
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

