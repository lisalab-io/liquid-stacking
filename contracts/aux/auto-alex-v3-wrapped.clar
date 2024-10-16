;; SPDX-License-Identifier: BUSL-1.1

(define-fungible-token auto-alex-v3-wrapped)

(define-constant err-unauthorised (err u1000))

(define-constant ONE_8 u100000000)
(define-constant token-decimals u8)

(define-data-var token-name (string-ascii 32) "vLiALEX")
(define-data-var token-symbol (string-ascii 32) "vLiALEX")
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.alexlab.co/metadata/auto-alex-v3-wrapped.json"))

;; governance functions

(define-public (set-name (new-name (string-ascii 32)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-name new-name))))

(define-public (set-symbol (new-symbol (string-ascii 32)))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-symbol new-symbol))))

(define-public (set-token-uri (new-uri (optional (string-utf8 256))))
	(begin
		(try! (is-dao-or-extension))
		(ok (var-set token-uri new-uri))))

;; public functions

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(begin
		(asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-unauthorised)
		(try! (ft-transfer? auto-alex-v3-wrapped amount sender recipient))
		(print { type: "transfer", amount: amount, sender: sender, recipient: recipient, memo: memo })
		(ok true)))

(define-public (mint (amount uint) (recipient principal))
	(begin 
		(asserts! (or (is-eq tx-sender recipient) (is-eq contract-caller recipient)) err-unauthorised)				
		(try! (ft-mint? auto-alex-v3-wrapped (get-tokens-to-shares amount) recipient))
		(contract-call? .auto-alex-v3 transfer amount recipient (as-contract tx-sender) none)))

(define-public (burn (amount uint) (sender principal))
	(begin
		(asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-unauthorised)
		(as-contract (try! (contract-call? .auto-alex-v3 transfer (get-shares-to-tokens amount) tx-sender sender none)))
		(ft-burn? auto-alex-v3-wrapped amount sender)))

;; read-only functions

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao) (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao is-extension contract-caller)) err-unauthorised)))
	
(define-read-only (get-name)
	(ok (var-get token-name)))

(define-read-only (get-symbol)
	(ok (var-get token-symbol)))

(define-read-only (get-token-uri)
	(ok (var-get token-uri)))

(define-read-only (get-decimals)
	(ok token-decimals))

(define-read-only (get-balance (who principal))
	(ok (ft-get-balance auto-alex-v3-wrapped who)))

(define-read-only (get-total-supply)
	(ok (ft-get-supply auto-alex-v3-wrapped)))

(define-read-only (get-share (who principal))
	(ok (get-shares-to-tokens (ft-get-balance auto-alex-v3-wrapped who))))

(define-read-only (get-total-shares)
	(contract-call? .auto-alex-v3 get-balance (as-contract tx-sender)))

(define-read-only (get-tokens-to-shares (amount uint))
	(let (
			(total-shares (unwrap-panic (get-total-shares))))
		(if (is-eq total-shares u0)
			amount
			(/ (* amount (unwrap-panic (get-total-supply))) total-shares))))

(define-read-only (get-shares-to-tokens (shares uint))
	(let (
			(total-supply (ft-get-supply auto-alex-v3-wrapped)))
		(if (is-eq total-supply u0)
			shares
			(/ (* shares (unwrap-panic (get-total-shares))) total-supply))))

;; private functions

