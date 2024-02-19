(use-trait strategy-trait .strategy-trait.strategy-trait)

(define-constant err-unauthorised (err u3000))

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-private (sum-strategy-amounts (strategy <strategy-trait>) (accumulator (response uint uint)))
	(ok (+ (try! (contract-call? strategy get-amount-in-strategy)) (try! accumulator)))
)

(define-public (rebase (strategies (list 20 <strategy-trait>)))
	(let ((total-stx (+ (stx-get-balance .vault) (try! (fold sum-strategy-amounts strategies (ok u0))))))
		(try! (is-dao-or-extension))
		(try! (contract-call? .token-lqstx set-reward-multiplier-from-balance total-stx))
		(ok total-stx)
	)
)
