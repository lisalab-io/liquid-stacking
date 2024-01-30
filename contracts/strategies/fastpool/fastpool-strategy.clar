(impl-trait .strategy-trait.strategy-trait)

(define-constant err-not-vault-caller (err u2000))
(define-constant err-invalid-payload (err u2001))
(define-constant err-balance-insufficient (err u2002))

(define-data-var amount-in-strategy uint u0)

(define-constant member-list (list
	(to-trait .fastpool-member1) (to-trait .fastpool-member2) (to-trait .fastpool-member3) (to-trait .fastpool-member4) (to-trait .fastpool-member5)
	(to-trait .fastpool-member6) (to-trait .fastpool-member7) (to-trait .fastpool-member8) (to-trait .fastpool-member9) (to-trait .fastpool-member10)
	(to-trait .fastpool-member11) (to-trait .fastpool-member12) (to-trait .fastpool-member13) (to-trait .fastpool-member14) (to-trait .fastpool-member15)
	(to-trait .fastpool-member16) (to-trait .fastpool-member17) (to-trait .fastpool-member18) (to-trait .fastpool-member19) (to-trait .fastpool-member20)
))

(define-trait pool-member
	(
		(delegate-stx (uint) (response bool uint))
		(revoke-delegate-stx () (response bool uint))
		(refund-stx (principal) (response uint uint))
	)
)

(define-read-only (is-vault-caller)
	(ok (asserts! (is-eq tx-sender .vault) err-not-vault-caller))
)

(define-private (process-strategy (amount uint) (member <pool-member>))
	(let (
		(member-principal (contract-of member))
		(account (stx-account member-principal))
		(total-balance (stx-get-balance member-principal))
		(locked-amount (get locked account))
		(unlocked-amount (get unlocked account))
	)
		(if (< amount locked-amount)
			(begin
				(try! (contract-call? member revoke-delegate-stx))
				(ok u0)
			)
		;; else
			(let (
				(difference (- amount locked-amount))
				(amount-transferred (if (> difference unlocked-amount) (- difference unlocked-amount) u0))
				)
				(and (> amount-transferred u0)
					;; tx-sender is the vault
					(try! (stx-transfer? amount-transferred tx-sender member-principal))
				)
				(try! (contract-call? member delegate-stx amount))
				(ok amount-transferred)
			)
		)
	)
)

(define-public (execute (payload (buff 2048)))
	(let (
		(amounts (unwrap! (from-consensus-buff? (list 20 uint) payload) err-invalid-payload))
		(total-amount (fold sum (print (map process-strategy amounts member-list)) u0))
		)
		(try! (is-vault-caller))
		(var-set amount-in-strategy (+ (var-get amount-in-strategy) total-amount))
		(ok total-amount)
	)
)

(define-private (process-refund (selected bool) (member <pool-member>))
	(if selected
		;; tx-sender is the vault here
		(contract-call? member refund-stx tx-sender)
		(ok u0)
	)
)

(define-public (refund (payload (buff 2048)))
	(let (
		(refunds (unwrap! (from-consensus-buff? (list 20 bool) payload) err-invalid-payload))
		(total-amount (fold sum (print (map process-refund refunds member-list)) u0))
		)
		(try! (is-vault-caller))
		(var-set amount-in-strategy (default-to u0 (safe-sub (var-get amount-in-strategy) total-amount)))
		(ok total-amount)
	)
)

(define-read-only (sum (entry (response uint uint)) (accumulator uint))
	(match entry
		amount (+ amount accumulator)
		err-val accumulator
	)
)

(define-read-only (get-amount-in-strategy)
	(ok (var-get amount-in-strategy))
)

(define-private (get-member-balance-iter (member <pool-member>) (accumulator uint))
	(+ (stx-get-balance (contract-of member)) accumulator)
)

(define-read-only (get-total-member-balances)
	(fold get-member-balance-iter member-list u0)
)

(define-private (get-total-member-locked-amount-iter (member <pool-member>) (accumulator uint))
	(+ (get locked (stx-account (contract-of member))) accumulator)
)

(define-read-only (get-total-member-locked-amount)
	(fold get-total-member-locked-amount-iter member-list u0)
)

(define-private (safe-sub (a uint) (b uint))
	(if (>= a b) (some (- a b)) none)
)

(define-read-only (to-trait (trait <pool-member>)) trait)