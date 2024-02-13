(impl-trait .extension-trait.extension-trait)

(define-constant err-unauthorised (err u10000))

(define-map authorised-managers principal bool)
(map-set authorised-managers tx-sender true)

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-read-only (is-authorised-manager (who principal))
	(default-to false (map-get? authorised-managers who))
)

(define-public (fund-strategy (amounts (list 20 uint)))
	(begin
		(asserts! (is-authorised-manager tx-sender) err-unauthorised)
		(contract-call? .vault fund-strategy .fastpool-strategy (unwrap-panic (to-consensus-buff? amounts)))
	)
)

(define-public (refund-strategy (selection (list 20 bool)))
	(begin
		(asserts! (is-authorised-manager tx-sender) err-unauthorised)
		(contract-call? .vault refund-strategy .fastpool-strategy (unwrap-panic (to-consensus-buff? selection)))
	)
)

(define-public (set-authorised-manager (who principal) (enabled bool))
	(begin
		(try! (is-dao-or-extension))
		(ok (map-set authorised-managers who enabled))
	)
)

(define-public (callback (sender principal) (memo (buff 34)))
	(ok true)
)