;; SPDX-License-Identifier: BUSL-1.1

(define-fungible-token auto-alex-v3)

(define-constant err-unauthorised (err u1000))
(define-constant err-invalid-amount (err u1001))

(define-constant ONE_8 u100000000)

(define-constant token-decimals u8)

(define-data-var token-name (string-ascii 32) "LiALEX")
(define-data-var token-symbol (string-ascii 32) "LiALEX")
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://cdn.alexlab.co/metadata/auto-alex-v3.json"))

(define-data-var reserve uint u0)

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

;; privileged calls

(define-public (set-reserve (new-reserve uint))
	(begin 
		(try! (is-dao-or-extension))
		(var-set reserve new-reserve)
		(print {notification: "rebase", payload: {reserve: (var-get reserve), total-shares: (ft-get-supply auto-alex-v3)}})
		(ok true)))

(define-public (add-reserve (increment uint))
	(set-reserve (+ (var-get reserve) increment)))

(define-public (remove-reserve (decrement uint))
	(begin 
		(asserts! (<= decrement (var-get reserve)) err-invalid-amount)
		(set-reserve (- (var-get reserve) decrement))))

(define-public (mint (amount uint) (recipient principal))
	(begin		
		(try! (is-dao-or-extension))
		(ft-mint? auto-alex-v3 (get-tokens-to-shares amount) recipient)))

(define-public (burn (amount uint) (sender principal))
	(begin
		(try! (is-dao-or-extension))
		(ft-burn? auto-alex-v3 (get-tokens-to-shares amount) sender)))

(define-public (burn-many (senders (list 200 {amount: uint, sender: principal})))
	(fold check-err (map burn-many-iter senders) (ok true)))

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
	(ok (get-shares-to-tokens (unwrap-panic (get-share who)))))

(define-read-only (get-total-supply)
	(get-reserve))

(define-read-only (get-share (who principal))
	(ok (ft-get-balance auto-alex-v3 who)))

(define-read-only (get-total-shares)
	(ok (ft-get-supply auto-alex-v3)))

(define-read-only (get-reserve)
	(ok (var-get reserve)))

(define-read-only (get-tokens-to-shares (amount uint))
	(if (is-eq (get-reserve) (ok u0))
		amount
		(/ (* amount (unwrap-panic (get-total-shares))) (unwrap-panic (get-reserve)))))

(define-read-only (get-shares-to-tokens (shares uint))
	(if (is-eq (get-total-shares) (ok u0))
		shares
		(/ (* shares (unwrap-panic (get-reserve))) (unwrap-panic (get-total-shares)))))

;; public calls

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
	(let (
			(shares (get-tokens-to-shares amount)))
		(asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) err-unauthorised)
		(try! (ft-transfer? auto-alex-v3 shares sender recipient))
		(match memo to-print (print to-print) 0x)
		(print { notification: "transfer", payload: { amount: amount, shares: shares, sender: sender, recipient: recipient } })
		(ok true)))

;; private functions

(define-private (burn-many-iter (item {amount: uint, sender: principal}))
	(burn (get amount item) (get sender item)))

(define-private (check-err (result (response bool uint)) (prior (response bool uint)))
    (match prior ok-value result err-value (err err-value)))

;; staking related fuctions

(use-trait ft-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-public (stake-tokens (amount-tokens uint) (lock-period uint))
	(begin
		(try! (is-dao-or-extension))
		(as-contract (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2 stake-tokens amount-tokens lock-period))))

(define-public (transfer-token (token-trait <ft-trait>) (amount uint) (recipient principal))
	(begin 
		(try! (is-dao-or-extension))
		(if (is-eq (contract-of token-trait) (as-contract tx-sender))
			(as-contract (transfer amount tx-sender recipient none))
			(as-contract (contract-call? token-trait transfer amount tx-sender recipient none)))))

(define-public (claim-staking-reward (reward-cycle uint))
	(begin 
		(try! (is-dao-or-extension))
		(as-contract (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2 claim-staking-reward reward-cycle))))

(define-public (reduce-position-v2)
	(let (
			(bal-v2 (unwrap-panic (contract-call? 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.auto-alex-v2 get-balance (as-contract tx-sender))))
			(reduced (if (is-eq u0 bal-v2) u0 (as-contract (try! (contract-call? 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.auto-alex-v2 reduce-position ONE_8))))))
		(try! (is-dao-or-extension))
		(as-contract (try! (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.migrate-legacy-v2-wl migrate)))
		(ok reduced)))
		

