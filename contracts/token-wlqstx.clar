;; wlqstx
;;

(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ONE_8 u100000000)

(define-fungible-token wlqstx)

(define-data-var contract-owner principal tx-sender)

(define-data-var token-name (string-ascii 32) "wlqstx")
(define-data-var token-symbol (string-ascii 10) "wlqstx")
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.alexlab.co/metadata/wlqstx.json"))

(define-data-var token-decimals uint u8)

;; governance functions

(define-public (set-contract-owner (owner principal))
	(begin
		(try! (check-is-owner))
		(ok (var-set contract-owner owner))))


(define-public (set-name (new-name (string-ascii 32)))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-name new-name))))

(define-public (set-symbol (new-symbol (string-ascii 10)))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-symbol new-symbol))
	)
)

(define-public (set-decimals (new-decimals uint))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-decimals new-decimals))))

(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
	(begin
		(try! (check-is-owner))
		(ok (var-set token-uri new-uri))))

;; priviledged functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(transfer-fixed (decimals-to-fixed amount) sender recipient memo))

(define-public (mint (amount uint) (recipient principal))
	(mint-fixed (decimals-to-fixed amount) recipient))

(define-public (burn (amount uint) (sender principal))
	(burn-fixed (decimals-to-fixed amount) sender))

(define-public (transfer-fixed (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (is-eq sender tx-sender) ERR-NOT-AUTHORIZED)
		(try! (ft-transfer? wlqstx (fixed-to-decimals amount) sender recipient))
		(match memo to-print (print to-print) 0x)
		(ok true)))

(define-public (mint-fixed (amount uint) (recipient principal))
	(let 
		(
			(shares (convert-to-shares amount))
		)		
		(asserts! (is-eq recipient tx-sender) ERR-NOT-AUTHORIZED)
		(try! (contract-call? .token-lqstx transfer-fixed amount recipient (as-contract tx-sender) none))		
		(ft-mint? wlqstx (fixed-to-decimals shares) recipient)))

(define-public (burn-fixed (amount uint) (sender principal))
	(let 
		(
			(vaulted-amount (convert-to-tokens amount))
		)
		(asserts! (is-eq sender tx-sender) ERR-NOT-AUTHORIZED)
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

(define-read-only (get-contract-owner)
	(ok (var-get contract-owner)))

;; private functions

(define-private (check-is-owner)
	(ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)))

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
