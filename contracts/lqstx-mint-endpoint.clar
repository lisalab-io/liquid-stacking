;;
;; lqstx-mint-endpoint
;;

(impl-trait .extension-trait.extension-trait)

(use-trait sip-010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant err-unauthorised (err u1000))
(define-constant err-paused (err u1001))
(define-constant err-request-pending (err u1006))

(define-data-var paused bool true)

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised)))

;; read-only calls

(define-read-only (is-paused)
    (var-get paused))

(define-read-only (is-paused-or-fail)
    (ok (asserts! (not (is-paused)) err-paused)))

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
        (ok (asserts! (>= (get-rewards-paid-upto) (get requested-at request-details)) err-request-pending))))

;; @dev it favours smaller amounts as we do not allow partial burn
(define-read-only (validate-burn-request (request-id uint))
    (let (
          (request-details (try! (contract-call? .lqstx-mint-registry get-burn-request-or-fail request-id)))
          (vaulted-amount (contract-call? .token-wlqstx convert-to-tokens (get amount request-details)))
          (balance (stx-account .vault)))
        (asserts! (>= (* (get unlocked balance) u100) vaulted-amount) err-request-pending)
        (ok { vaulted-amount: vaulted-amount, balance: balance })))

(define-public (set-paused (new-paused bool))
    (begin 
        (try! (is-dao-or-extension))
        (ok (var-set paused new-paused))))
        
;; public calls

(define-public (request-mint (amount-in-fixed uint))
    (let (
            (cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle))
            (request-details { requested-by: tx-sender, amount: amount-in-fixed, requested-at: cycle, status: (get-pending) })
            (request-id (as-contract (try! (contract-call? .lqstx-mint-registry set-mint-request u0 request-details)))))
        (try! (is-paused-or-fail))
        (try! (stx-transfer? (/ amount-in-fixed u100) tx-sender .vault)) 
        (print { type: "mint-request", id: request-id, details: request-details})
        (ok request-id)))

(define-public (finalize-mint (request-id uint))
    (let (
            (request-details (try! (get-mint-request-or-fail request-id))))
        (try! (is-paused-or-fail))
        (try! (validate-mint-request request-id))
        (try! (contract-call? .token-lqstx dao-mint-fixed (get amount request-details) (get requested-by request-details)))
        (as-contract (contract-call? .lqstx-mint-registry set-mint-request request-id (merge request-details { status: (get-finalized) })))))

(define-public (revoke-mint (request-id uint))
    (ok true))

(define-public (request-burn (amount-in-fixed uint))
    (let (
            ;; @dev requested-at not used for burn
            (cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle))
            (request-details { requested-by: tx-sender, amount: amount-in-fixed, requested-at: cycle, status: (get-pending) })
            (request-id (as-contract (try! (contract-call? .lqstx-mint-registry set-burn-request u0 request-details)))))
        (try! (is-paused-or-fail))
        (try! (contract-call? .token-wlqstx mint-fixed amount-in-fixed tx-sender))
        (try! (contract-call? .token-wlqstx transfer-fixed amount-in-fixed tx-sender .lqstx-mint-registry none))
        (print { type: "burn-request", id: request-id, details: request-details })
        (ok request-id)))

(define-public (finalize-burn (request-id uint))
    (let (
            (request-details (try! (get-burn-request-or-fail request-id)))
            (transfer-wlqstx (as-contract (try! (contract-call? .lqstx-mint-registry transfer-fixed (get amount request-details) tx-sender .token-wlqstx))))
            (validation-data (try! (validate-burn-request request-id))))
        (try! (is-paused-or-fail)) 
        (as-contract (try! (contract-call? .token-wlqstx burn-fixed (get amount request-details) tx-sender)))
        (as-contract (try! (contract-call? .token-lqstx dao-burn-fixed (get vaulted-amount validation-data) tx-sender)))
        (try! (contract-call? .vault dynamic-transfer .stx-transfer-provider (unwrap-panic (to-consensus-buff? { ustx: (/ (get vaulted-amount validation-data) u100), recipient: (get requested-by request-details) }))))
        (as-contract (contract-call? .lqstx-mint-registry set-burn-request request-id (merge request-details { status: (get-finalized) })))))

(define-public (revoke-burn (request-id uint))
    (ok true))

(define-public (callback (extension principal) (payload (buff 34)))
    (ok true))
