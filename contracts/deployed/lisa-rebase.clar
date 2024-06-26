
;; SPDX-License-Identifier: BUSL-1.1

(use-trait strategy-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.strategy-trait.strategy-trait)

(define-constant err-unauthorised (err u3000))

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao) (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-private (sum-strategy-amounts (strategy <strategy-trait>) (accumulator (response uint uint)))
	(ok (+ (try! (contract-call? strategy get-amount-in-strategy)) (try! accumulator)))
)

(define-public (rebase (strategies (list 20 <strategy-trait>)))
	(let ((total-stx (- (+ (stx-get-balance 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault) (try! (fold sum-strategy-amounts strategies (ok u0)))) (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-mint-endpoint-v1-01 get-mint-requests-pending-amount))))
		(try! (is-dao-or-extension))
		(as-contract (try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx set-reserve total-stx)))
		(ok total-stx)
	)
)
