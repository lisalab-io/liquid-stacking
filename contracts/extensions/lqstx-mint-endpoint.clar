;;
;; lqstx-mint-endpoint
;;
(use-trait sip-010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant err-unauthorised (err u1000))
(define-constant err-paused (err u1001))
(define-constant err-request-pending (err u1006))
(define-constant err-request-finalized-or-revoked (err u1007))

(define-constant PENDING 0x00)
(define-constant FINALIZED 0x01)
(define-constant REVOKED 0x02)

(define-data-var paused bool true)

;; read-only calls

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised)))

(define-read-only (is-paused)
    (var-get paused))

(define-read-only (is-paused-or-fail)
    (ok (asserts! (not (is-paused)) err-paused)))

(define-read-only (get-mint-request-or-fail (request-id uint))
    (contract-call? .lqstx-mint-registry get-mint-request-or-fail request-id))

(define-read-only (get-burn-request-or-fail (request-id uint))
    (contract-call? .lqstx-mint-registry get-burn-request-or-fail request-id))

(define-read-only (get-rewards-paid-upto)
    (contract-call? .lqstx-mint-registry get-rewards-paid-upto))

(define-read-only (validate-mint-request (request-id uint))
    (let (
            (request-details (try! (contract-call? .lqstx-mint-registry get-mint-request-or-fail request-id))))
        (asserts! (>= (get-rewards-paid-upto) (get requested-at request-details)) err-request-pending)
        (asserts! (is-eq PENDING (get status request-details)) err-request-finalized-or-revoked)
        (ok true)))

;; @dev it favours smaller amounts as we do not allow partial burn
(define-read-only (validate-burn-request (request-id uint))
    (let (
            (request-details (try! (contract-call? .lqstx-mint-registry get-burn-request-or-fail request-id)))
            (vaulted-amount (unwrap-panic (contract-call? .token-wlqstx get-shares-to-tokens (get amount request-details))))
            (balance (stx-account .vault)))
        (asserts! (>= (* (get unlocked balance) u100) vaulted-amount) err-request-pending)
        (asserts! (is-eq PENDING (get status request-details)) err-request-finalized-or-revoked)
        (ok { vaulted-amount: vaulted-amount, balance: balance })))

(define-public (set-paused (new-paused bool))
    (begin 
        (try! (is-dao-or-extension))
        (ok (var-set paused new-paused))))
        
;; public calls

;; @dev the requestor stx is held by the contract until mint can be finalized.
(define-public (request-mint (amount-in-fixed uint))
    (let (
            (cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle))
            (request-details { requested-by: tx-sender, amount: amount-in-fixed, requested-at: cycle, status: PENDING })
            (request-id (as-contract (try! (contract-call? .lqstx-mint-registry set-mint-request u0 request-details)))))
        (try! (is-paused-or-fail))
        (try! (stx-transfer? (/ amount-in-fixed u100) tx-sender .lqstx-mint-registry)) 
        (print { type: "mint-request", id: request-id, details: request-details})
        (ok request-id)))

(define-public (finalize-mint (request-id uint))
    (let (
            (request-details (try! (get-mint-request-or-fail request-id))))
        (try! (is-paused-or-fail))
        (try! (validate-mint-request request-id))
        (as-contract (try! (contract-call? .lqstx-mint-registry stx-transfer (/ (get amount request-details) u100) .vault)))
        (as-contract (try! (contract-call? .token-lqstx dao-mint-fixed (get amount request-details) (get requested-by request-details))))
        (as-contract (contract-call? .lqstx-mint-registry set-mint-request request-id (merge request-details { status: FINALIZED })))))

(define-public (revoke-mint (request-id uint))
    (let (
            (request-details (try! (get-mint-request-or-fail request-id))))
        (try! (is-paused-or-fail))
        (asserts! (is-eq tx-sender (get requested-by request-details)) err-unauthorised)
        (asserts! (is-eq PENDING (get status request-details)) err-request-finalized-or-revoked)        
        (as-contract (try! (contract-call? .lqstx-mint-registry stx-transfer (/ (get amount request-details) u100) (get requested-by request-details))))
        (as-contract (contract-call? .lqstx-mint-registry set-mint-request request-id (merge request-details { status: REVOKED })))))

(define-public (request-burn (amount-in-fixed uint))
    (let (
            ;; @dev requested-at not used for burn
            (cycle (contract-call? 'SP000000000000000000002Q6VF78.pox-3 current-pox-reward-cycle))
            (request-details { requested-by: tx-sender, amount: amount-in-fixed, requested-at: cycle, status: PENDING })
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
        (try! (contract-call? .token-wlqstx burn-fixed (get amount request-details) tx-sender))
        (try! (contract-call? .token-lqstx dao-burn-fixed (get vaulted-amount validation-data) tx-sender))
        (as-contract (try! (contract-call? .vault proxy-call .stx-transfer-proxy (unwrap-panic (to-consensus-buff? { ustx: (/ (get vaulted-amount validation-data) u100), recipient: (get requested-by request-details) })))))
        (as-contract (contract-call? .lqstx-mint-registry set-burn-request request-id (merge request-details { status: FINALIZED })))))

(define-public (revoke-burn (request-id uint))
    (let (
            (request-details (try! (get-burn-request-or-fail request-id))))
        (try! (is-paused-or-fail))
        (asserts! (is-eq PENDING (get status request-details)) err-request-finalized-or-revoked)
        (asserts! (is-eq tx-sender (get requested-by request-details)) err-unauthorised)
        (try! (contract-call? .token-wlqstx burn-fixed (get amount request-details) tx-sender))
        (as-contract (contract-call? .token-lqstx transfer-fixed (unwrap-panic (contract-call? .token-wlqstx get-shares-to-tokens (get amount request-details))) tx-sender (get requested-by request-details) none))))
