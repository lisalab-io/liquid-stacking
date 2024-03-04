(use-trait strategy-trait .strategy-trait.strategy-trait)

(define-constant err-unauthorised (err u3000))

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-private (sum-strategy-amounts (strategy <strategy-trait>) (accumulator (response uint uint)))
	(ok (+ (try! (contract-call? strategy get-amount-in-strategy)) (try! accumulator)))
)

(define-public (rebase (strategies (list 20 <strategy-trait>)))
	(let ((total-stx (- (+ (stx-get-balance .lqstx-vault) (try! (fold sum-strategy-amounts strategies (ok u0)))) (contract-call? .lqstx-mint-endpoint get-mint-requests-pending-amount))))
		(try! (is-dao-or-extension))
		(as-contract (try! (contract-call? .token-lqstx set-reserve total-stx)))
		(ok total-stx)
	)
)

(define-public (callback (extension principal) (payload (buff 2048)))
    (ok true))