;; wlqstx
;;
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant err-unauthorised (err u3000))
(define-constant ONE_8 u100000000)

(define-fungible-token wlqstx)

(define-data-var token-name (string-ascii 32) "wlqstx")
(define-data-var token-symbol (string-ascii 10) "wlqstx")
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.alexlab.co/metadata/wlqstx.json"))

(define-data-var token-decimals uint u8)

;; governance functions

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-public (set-name (new-name (string-ascii 32)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-name new-name))))

(define-public (set-symbol (new-symbol (string-ascii 10)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-symbol new-symbol))
	)
)

(define-public (set-decimals (new-decimals uint))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-decimals new-decimals))))

(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-uri new-uri))))

;; priviledged functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(transfer-fixed (decimals-to-fixed amount) sender recipient memo))

(define-public (transfer-fixed (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (is-eq sender tx-sender) err-unauthorised)
		(try! (ft-transfer? wlqstx (fixed-to-decimals amount) sender recipient))
		(match memo to-print (print to-print) 0x)
		(ok true)))

(define-public (mint-fixed (amount uint) (recipient principal))
	(let 
		(
			(shares (convert-to-shares amount))
		)		
		(asserts! (is-eq recipient tx-sender) err-unauthorised)
		(try! (contract-call? .token-lqstx transfer-fixed amount recipient (as-contract tx-sender) none))		
		(ft-mint? wlqstx (fixed-to-decimals shares) recipient)))

(define-public (burn-fixed (amount uint) (sender principal))
	(let 
		(
			(vaulted-amount (convert-to-tokens amount))
		)
		(asserts! (is-eq sender tx-sender) err-unauthorised)
		(try! (ft-burn? wlqstx (fixed-to-decimals amount) sender))
		(as-contract (try! (contract-call? .token-lqstx transfer-fixed vaulted-amount tx-sender sender none)))
		(ok true)))

;; read-only functions

(define-read-only (get-name)
	(ok (var-get token-name)))

(define-read-only (get-symbol)
	(ok (var-get token-symbol)))

(define-read-only (get-decimals)
	(ok (var-get token-decimals)))

(define-read-only (get-balance (who principal))
	(ok (ft-get-balance wlqstx who)))

(define-read-only (get-total-supply)
	(ok (ft-get-supply wlqstx)))

(define-read-only (get-total-supply-fixed)
	(ok (decimals-to-fixed (unwrap-panic (get-total-supply)))))

(define-read-only (get-balance-fixed (account principal))
	(ok (decimals-to-fixed (unwrap-panic (get-balance account)))))

(define-read-only (get-token-uri)
	(ok (var-get token-uri)))

(define-read-only (get-vaulted-balance-fixed (who principal))
	(ok (convert-to-tokens (unwrap-panic (get-balance-fixed who)))))

(define-read-only (get-total-vaulted-balance-fixed)
	(ok (unwrap-panic (contract-call? .token-lqstx get-balance-fixed (as-contract tx-sender)))))

(define-read-only (convert-to-shares (amount uint))
	(let 
		(
			(total-supply (unwrap-panic (get-total-supply-fixed)))
		)
		(if (is-eq total-supply u0)
			amount
			(div-down (mul-down amount total-supply) (unwrap-panic (get-total-vaulted-balance-fixed)))
		)
	)
)

(define-read-only (convert-to-tokens (shares uint))
	(let 
		(
			(total-supply (unwrap-panic (get-total-supply-fixed)))
		)
		(if (is-eq total-supply u0)
			shares
			(div-down (mul-down shares (unwrap-panic (get-total-vaulted-balance-fixed))) total-supply)
		)
	)
)	

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
