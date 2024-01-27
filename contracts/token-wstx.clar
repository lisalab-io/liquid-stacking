(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant err-unauthorised (err u100))

(define-constant ONE_8 u100000000)

(define-public (transfer (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
	(begin
		(asserts! (is-eq tx-sender from) err-unauthorised)
		(match memo m
			(stx-transfer-memo? amount from to m)
			(stx-transfer? amount from to))
	))

(define-public (transfer-fixed (amount uint) (from principal) (to principal) (memo (optional (buff 34))))
	(transfer (decimals-to-fixed amount) from to memo))

(define-read-only (get-name)
	(ok "WSTX"))

(define-read-only (get-symbol)
	(ok "WSTX"))

(define-read-only (get-decimals)
	(ok u8))

(define-read-only (get-balance (who principal))
	(ok (stx-get-balance who)))

(define-read-only (get-total-supply)
	(ok stx-liquid-supply))

(define-read-only (get-token-uri)
	(ok none))

(define-read-only (get-total-supply-fixed)
	(ok (decimals-to-fixed (unwrap-panic (get-total-supply)))))

(define-read-only (get-balance-fixed (account principal))
	(ok (decimals-to-fixed (unwrap-panic (get-balance account)))))

;; private functions

(define-private (pow-decimals)
	(pow u10 (unwrap-panic (get-decimals))))

(define-private (decimals-to-fixed (amount uint))
	(/ (* amount ONE_8) (pow-decimals)))

(define-private (fixed-to-decimals (amount uint))
	(/ (* amount (pow-decimals)) ONE_8))

(define-private (mul-down (a uint) (b uint))
	(/ (* a b) ONE_8))

(define-private (div-down (a uint) (b uint))
	(if (is-eq a u0)
		u0
		(/ (* a ONE_8) b)))
