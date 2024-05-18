
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(let ((unminted-lqstx (- u1325539144827  u1100361600428))
			(amount-to-mint (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx get-shares-to-tokens unminted-lqstx)))
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx dao-mint amount-to-mint 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.treasury))
		(ok true)
	)
)
