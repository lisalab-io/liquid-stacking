;; lqstx
;;

(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ONE_8 u100000000)

(define-fungible-token lqstx)

(define-data-var contract-owner principal tx-sender)
(define-map approved-minters principal bool)
(define-map approved-oracles principal bool)

(define-data-var token-name (string-ascii 32) "lqstx")
(define-data-var token-symbol (string-ascii 10) "lqstx")
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.alexlab.co/metadata/token-lqstx.json"))

(define-data-var token-decimals uint u8)

(define-data-var reward-multiplier uint ONE_8)

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

(define-public (set-approved-minters (minter principal) (approved bool))
	(begin
		(try! (check-is-owner))
		(ok (map-set approved-minters minter approved))))

(define-public (set-approved-oracles (oracle principal) (approved bool))
	(begin
		(try! (check-is-owner))
		(ok (map-set approved-oracles oracle approved))))

;; priviledged functions

;; TODO: called upon adding rewards
(define-public (set-reward-multiplier (new-multiplier uint))
	(begin 
		(asserts! (or (is-ok (check-is-oracle)) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)		
		(ok (var-set reward-multiplier new-multiplier))
	)
)

(define-public (add-reward-multiplier (increment uint))
	(set-reward-multiplier (+ (var-get reward-multiplier) increment))
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(transfer-fixed (decimals-to-fixed amount) sender recipient memo))

(define-public (mint (amount uint) (recipient principal))
	(mint-fixed (decimals-to-fixed amount) recipient))

(define-public (burn (amount uint) (sender principal))
	(burn-fixed (decimals-to-fixed amount) sender))

(define-public (transfer-fixed (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (is-eq sender tx-sender) ERR-NOT-AUTHORIZED)
		(try! (ft-transfer? lqstx (fixed-to-decimals (convert-to-shares amount)) sender recipient))
		(match memo to-print (print to-print) 0x)
		(ok true)))	

(define-public (mint-fixed (amount uint) (recipient principal))
	(begin		
		(asserts! (or (is-ok (check-is-minter)) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)		
		(ft-mint? lqstx (fixed-to-decimals (convert-to-shares amount)) recipient)))

(define-public (burn-fixed (amount uint) (sender principal))
	(begin
		(asserts! (or (is-ok (check-is-minter)) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)
		(ft-burn? lqstx (fixed-to-decimals (convert-to-shares amount)) sender)))

(define-public (burn-fixed-many (senders (list 200 {amount: uint, sender: principal})))
	(begin
		(asserts! (or (is-ok (check-is-minter)) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)
		(ok (map burn-fixed-many-iter senders))))

;; read-only functions

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

(define-read-only (get-contract-owner)
	(ok (var-get contract-owner)))

(define-read-only (get-reward-multiplier)
	(var-get reward-multiplier))

(define-read-only (get-total-supply-fixed)
	(ok (decimals-to-fixed (unwrap-panic (get-total-supply)))))

(define-read-only (get-balance-fixed (account principal))
	(ok (decimals-to-fixed (unwrap-panic (get-balance account)))))

(define-read-only (check-is-minter)
	(ok (asserts! (default-to false (map-get? approved-minters tx-sender)) ERR-NOT-AUTHORIZED)))

(define-read-only (check-is-oracle)
	(ok (asserts! (default-to false (map-get? approved-oracles tx-sender)) ERR-NOT-AUTHORIZED)))	

;; private functions

(define-private (burn-fixed-many-iter (item {amount: uint, sender: principal}))
	(burn-fixed (get amount item) (get sender item)))

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
