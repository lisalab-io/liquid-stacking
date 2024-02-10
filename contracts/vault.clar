;; This contract holds the STX of the members

(use-trait strategy-trait .strategy-trait.strategy-trait)
(use-trait transfer-provider-trait .transfer-provider-trait.transfer-provider-trait)

(define-constant err-unauthorised (err u1000))

(define-map strategy-allocations principal uint)

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-public (fund-strategy (strategy <strategy-trait>) (payload (buff 2048)))
	(let (
		(strategy-contract (contract-of strategy))
		(amount-taken (try! (as-contract (contract-call? strategy execute payload))))
		)
		(try! (is-dao-or-extension))
		(map-set strategy-allocations strategy-contract (+ (strategy-allocation strategy-contract) amount-taken))
		(ok amount-taken)
	)
)

(define-public (refund-strategy (strategy <strategy-trait>) (payload (buff 2048)))
	(let (
		(strategy-contract (contract-of strategy))
		(amount-refunded (try! (as-contract (contract-call? strategy refund payload))))
		)
		(try! (is-dao-or-extension))
		(map-set strategy-allocations strategy-contract (default-to u0 (safe-sub (strategy-allocation strategy-contract) amount-refunded)))
		(ok amount-refunded)
	)
)

(define-public (dynamic-transfer (transfer-provider <transfer-provider-trait>) (payload (buff 512)))
	(begin
		(try! (is-dao-or-extension))
		(as-contract (contract-call? transfer-provider dynamic-transfer payload))
	)
)

(define-private (strategy-allocation (strategy principal))
	(default-to u0 (map-get? strategy-allocations strategy))
)

(define-read-only (get-strategy-allocation (strategy principal))
	(ok (strategy-allocation strategy))
)

(define-private (safe-sub (a uint) (b uint))
	(if (>= a b) (some (- a b)) none)
)
