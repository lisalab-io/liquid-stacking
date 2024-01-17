;;
;; lqstx-mint-endpoint
;;

(use-trait sip010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

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

(define-read-only (get-rewards-paid-upto)
    (contract-call? .lqstx-mint-registry get-rewards-paid-upto))

(define-read-only (validate-mint-request (request-id uint))
    (let (
          (request-details (try! (contract-call? .lqstx-mint-registry get-mint-request-or-fail request-id))))
        (ok (asserts! (>= (get-rewards-paid-upto) (get requested-at request-details)) ERR-REQUEST-PENDING))))

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
            (sender tx-sender)
            (cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle))
            (request-details { requested-by: sender, amount: amount, requested-at: cycle, status: (get-pending) })
            (request-id (as-contract (try! (contract-call? .lqstx-mint-registry set-mint-request u0 request-details)))))
        (try! (is-paused-or-fail))
        (try! (contract-call? 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.token-wstx transfer-fixed amount tx-sender .lqstx-mint-registry none))        
        (print { type: "mint-request", id: request-id, details: request-details})
        (ok true)))

(define-public (finalize-mint (request-id uint))
    (let (
            (sender tx-sender)
            (request-details (try! (get-mint-request-or-fail request-id))))
        (try! (validate-mint-request request-id))
        (try! (contract-call? .token-lqstx mint-fixed (get amount request-details) (get requested-by request-details)))
        (as-contract (contract-call? .lqstx-mint-registry set-mint-request request-id (merge request-details { status: (get-finalized) })))))

(define-public (revoke-mint (request-id uint))
    (ok true))

(define-public (request-burn (amount uint))
    (ok true))

(define-public (finalize-burn (request-id uint))
    (ok true))

(define-public (revoke-burn (request-id uint))
    (ok true))

;; private calls

(define-private (check-is-owner)
	(ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)))