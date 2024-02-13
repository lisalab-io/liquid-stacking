;; lqstx
;;
(impl-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant err-unauthorised (err u3000))
(define-constant ONE_8 u100000000)

(define-fungible-token lqstx)

(define-data-var token-name (string-ascii 32) "lqstx")
(define-data-var token-symbol (string-ascii 10) "lqstx")
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.alexlab.co/metadata/token-lqstx.json"))

(define-data-var token-decimals uint u8)

(define-data-var reward-multiplier uint ONE_8)

;; governance functions

(define-public (dao-set-name (new-name (string-ascii 32)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-name new-name))))

(define-public (dao-set-symbol (new-symbol (string-ascii 10)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-symbol new-symbol))
	)
)

(define-public (dao-set-decimals (new-decimals uint))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-decimals new-decimals))))

(define-public (dao-set-token-uri (new-uri (optional (string-utf8 256))))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-uri new-uri))))

(define-public (set-reward-multiplier (new-multiplier uint))
	(begin 
		(try! (is-dao-or-extension))
		(ok (var-set reward-multiplier new-multiplier))
	)
)

(define-public (add-reward-multiplier (increment uint))
	(set-reward-multiplier (+ (var-get reward-multiplier) increment))
)

(define-public (dao-mint (amount uint) (recipient principal))
	(begin		
		(try! (is-dao-or-extension))
		(ft-mint? lqstx (convert-to-shares amount) recipient)))

(define-public (dao-mint-fixed (amount uint) (recipient principal))
	(begin		
		(try! (is-dao-or-extension))
		(ft-mint? lqstx (fixed-to-decimals (convert-to-shares amount)) recipient)))

(define-public (dao-burn-fixed (amount uint) (sender principal))
	(begin
		(try! (is-dao-or-extension))
		(ft-burn? lqstx (fixed-to-decimals (convert-to-shares amount)) sender)))

(define-public (dao-burn (amount uint) (sender principal))
	(begin
		(try! (is-dao-or-extension))
		(ft-burn? lqstx (convert-to-shares amount) sender)))

(define-public (dao-burn-fixed-many (senders (list 200 {amount: uint, sender: principal})))
	(begin
		(try! (is-dao-or-extension))
		(ok (map dao-burn-fixed-many-iter senders))))

;; read-only functions

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-read-only (get-name)
	(ok (var-get token-name)))

(define-read-only (get-symbol)
	(ok (var-get token-symbol)))

(define-read-only (get-decimals)
	(ok (var-get token-decimals)))

(define-read-only (get-balance (who principal))
	(ok (convert-to-tokens (get-shares who))))

(define-read-only (get-total-supply)
	(ok (convert-to-tokens (get-total-shares))))

(define-read-only (get-token-uri)
	(ok (var-get token-uri)))

(define-read-only (get-shares (who principal))
	(ft-get-balance lqstx who))

(define-read-only (get-total-shares)
	(ft-get-supply lqstx))

(define-read-only (convert-to-shares (amount uint))
	(div-down amount (var-get reward-multiplier)))

(define-read-only (convert-to-tokens (shares uint))
	(mul-down shares (var-get reward-multiplier)))

(define-read-only (get-reward-multiplier)
	(var-get reward-multiplier))

(define-read-only (get-total-supply-fixed)
	(ok (decimals-to-fixed (unwrap-panic (get-total-supply)))))

(define-read-only (get-balance-fixed (account principal))
	(ok (decimals-to-fixed (unwrap-panic (get-balance account)))))

;; public calls

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(transfer-fixed (decimals-to-fixed amount) sender recipient memo))

(define-public (transfer-fixed (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (is-eq sender tx-sender) err-unauthorised)
		(try! (ft-transfer? lqstx (fixed-to-decimals (convert-to-shares amount)) sender recipient))
		(match memo to-print (print to-print) 0x)
		(ok true)))	
		
;; private functions

(define-private (dao-burn-fixed-many-iter (item {amount: uint, sender: principal}))
	(dao-burn-fixed (get amount item) (get sender item)))

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
