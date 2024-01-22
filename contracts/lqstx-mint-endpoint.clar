;;
;; lqstx-mint-endpoint
;;

(use-trait sip010-trait .trait-sip-010.sip-010-trait)

(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-PAUSED (err u1001))
(define-constant ERR-INVALID-AMOUNT (err u1002))
(define-constant ERR-TOKEN-MISMATCH (err u1003))
(define-constant ERR-SENDER-MISMATCH (err u1004))
(define-constant ERR-REQUEST-NOT-PENDING (err u1005))
(define-constant ERR-REQUEST-PENDING (err u1006))

(define-data-var contract-owner principal tx-sender)

(define-data-var paused bool true)

;; read-only calls

(define-read-only (is-paused)
    (var-get paused))

(define-read-only (is-paused-or-fail)
    (ok (asserts! (not (is-paused)) ERR-PAUSED)))

(define-read-only (get-pending)
    (contract-call? .lqstx-mint-registry get-pending))

(define-read-only (get-finalized)
    (contract-call? .lqstx-mint-registry get-finalized))

(define-read-only (get-revoked)
    (contract-call? .lqstx-mint-registry get-revoked))

(define-read-only (get-mint-request-or-fail (request-id uint))
    (contract-call? .lqstx-mint-registry get-mint-request-or-fail request-id))

(define-read-only (get-burn-request-or-fail (request-id uint))
    (contract-call? .lqstx-mint-registry get-burn-request-or-fail request-id))

(define-read-only (get-rewards-paid-upto)
    (contract-call? .lqstx-mint-registry get-rewards-paid-upto))

(define-read-only (validate-mint-request (request-id uint))
    (let (
          (request-details (try! (contract-call? .lqstx-mint-registry get-mint-request-or-fail request-id))))
        (ok (asserts! (>= (get-rewards-paid-upto) (get requested-at request-details)) ERR-REQUEST-PENDING))))

;; @dev it favours smaller amounts as we do not allow partial burn
(define-read-only (validate-burn-request (request-id uint))
    (let (
          (request-details (try! (contract-call? .lqstx-mint-registry get-burn-request-or-fail request-id)))
          (vaulted-amount (contract-call? .token-wlqstx convert-to-tokens (get amount request-details)))
          (balance (stx-account .lqstx-mint-registry)))
        (asserts! (>= (get unlocked balance) vaulted-amount) ERR-REQUEST-PENDING)
        (ok { vaulted-amount: vaulted-amount, balance: balance })))

;; governance calls

(define-public (set-contract-owner (owner principal))
	(begin
		(try! (check-is-owner))
		(ok (var-set contract-owner owner))))

(define-public (set-paused (new-paused bool))
    (begin 
        (try! (check-is-owner))
        (ok (var-set paused new-paused))))

;; public calls

(define-public (request-mint (amount uint))
    (let (
            (cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle))
            (request-details { requested-by: tx-sender, amount: amount, requested-at: cycle, status: (get-pending) })
            (request-id (as-contract (try! (contract-call? .lqstx-mint-registry set-mint-request u0 request-details)))))
        (try! (is-paused-or-fail))
        (try! (contract-call? .token-wstx transfer-fixed amount tx-sender .lqstx-mint-registry none)) 
        (print { type: "mint-request", id: request-id, details: request-details})
        (ok request-id)))

(define-public (finalize-mint (request-id uint))
    (let (
            (request-details (try! (get-mint-request-or-fail request-id))))
        (try! (is-paused-or-fail))
        (try! (validate-mint-request request-id))
        (try! (contract-call? .token-lqstx mint-fixed (get amount request-details) (get requested-by request-details)))
        (as-contract (contract-call? .lqstx-mint-registry set-mint-request request-id (merge request-details { status: (get-finalized) })))))

(define-public (revoke-mint (request-id uint))
    (ok true))

(define-public (request-burn (amount uint))
    (let (
            ;; @dev requested-at not used for burn
            (cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle))
            (request-details { requested-by: tx-sender, amount: amount, requested-at: cycle, status: (get-pending) })
            (request-id (as-contract (try! (contract-call? .lqstx-mint-registry set-burn-request u0 request-details)))))
        (try! (is-paused-or-fail))
        (try! (contract-call? .token-wlqstx mint-fixed amount tx-sender))
        (try! (contract-call? .token-wlqstx transfer-fixed amount tx-sender .lqstx-mint-registry none))
        (print { type: "burn-request", id: request-id, details: request-details })
        (ok request-id)))

(define-public (finalize-burn (request-id uint))
    (let (
            (request-details (try! (get-burn-request-or-fail request-id)))
            (transfer-wlqstx (as-contract (try! (contract-call? .lqstx-mint-registry transfer-fixed (get amount request-details) tx-sender .token-wlqstx))))
            (validation-data (try! (validate-burn-request request-id))))
        (try! (is-paused-or-fail)) 
        (as-contract (try! (contract-call? .token-wlqstx burn-fixed (get amount request-details) tx-sender)))
        (as-contract (try! (contract-call? .token-lqstx burn-fixed (get vaulted-amount validation-data) tx-sender)))
        (as-contract (try! (contract-call? .lqstx-mint-registry transfer-fixed (get vaulted-amount validation-data) (get requested-by request-details) .token-wstx)))
        (as-contract (contract-call? .lqstx-mint-registry set-burn-request request-id (merge request-details { status: (get-finalized) })))))

(define-public (revoke-burn (request-id uint))
    (ok true))

;; private calls

(define-private (check-is-owner)
	(ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)))