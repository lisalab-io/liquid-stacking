(impl-trait .strategy-trait.strategy-trait)

(define-constant err-unauthorised (err u1000))

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised)))

(define-read-only (create-payload (amount uint))
    (unwrap-panic (to-consensus-buff? amount)))

;; governance calls

(define-public (execute (payload (buff 2048)))
    (let (
        (amount (unwrap-panic (from-consensus-buff? uint payload))))
        (try! (is-dao-or-extension))
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        (ok amount)))

(define-public (refund (payload (buff 2048)))
    (let (
        (sender tx-sender)
        (amount (unwrap-panic (from-consensus-buff? uint payload))))
        (try! (is-dao-or-extension))
        (as-contract (try! (stx-transfer? amount tx-sender sender)))
        (ok amount)))

(define-read-only (get-amount-in-strategy)
    (ok (stx-get-balance (as-contract tx-sender))))