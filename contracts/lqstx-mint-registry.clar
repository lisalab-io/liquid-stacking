;;
;; lqstx-mint-registry
;;

(use-trait sip-010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)
(use-trait sip-010-extensions-trait .sip-010-extensions-trait.sip-010-extensions-trait)

(define-constant err-unauthorised (err u1000))
(define-constant err-unknown-request-id (err u1008))

(define-constant PENDING u0)
(define-constant FINALIZED u1)
(define-constant REVOKED u2)

(define-data-var rewards-paid-upto uint u0)

(define-data-var mint-request-nonce uint u0)
(define-data-var burn-request-nonce uint u0)

(define-map mint-requests uint { requested-by: principal, amount: uint, requested-at: uint, status: uint })
(define-map burn-requests uint { requested-by: principal, amount: uint, requested-at: uint, status: uint })

;; read-only calls

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised)))

(define-read-only (get-pending) PENDING)
(define-read-only (get-finalized) FINALIZED)
(define-read-only (get-revoked) REVOKED)

(define-read-only (get-rewards-paid-upto)
	(var-get rewards-paid-upto))
	
(define-read-only (get-mint-request-nonce)
	(var-get mint-request-nonce))

(define-read-only (get-burn-request-nonce)
	(var-get burn-request-nonce))

(define-read-only (get-mint-request-or-fail (request-id uint))
	(ok (unwrap! (map-get? mint-requests request-id) err-unknown-request-id)))

(define-read-only (get-burn-request-or-fail (request-id uint))
	(ok (unwrap! (map-get? burn-requests request-id) err-unknown-request-id)))	

;; governance calls

;; @dev this should be called after all strategies paid rewards for the relevant cycle
(define-public (set-rewards-paid-upto (cycle uint) (vault-balance uint))
	(begin 
		(try! (is-dao-or-extension))
		(try! (contract-call? .token-lqstx set-reward-multiplier vault-balance))
		(ok (var-set rewards-paid-upto cycle))))

(define-public (set-mint-request (request-id uint) (details { requested-by: principal, amount: uint, requested-at: uint, status: uint }))
	(let
		(
			(current-nonce (var-get mint-request-nonce))
			(id (if (is-some (map-get? mint-requests request-id)) request-id (begin (var-set mint-request-nonce (+ current-nonce u1)) current-nonce)))
		)
		(try! (is-dao-or-extension))
		(map-set mint-requests id details)
		(ok id)))

(define-public (set-burn-request (request-id uint) (details { requested-by: principal, amount: uint, requested-at: uint, status: uint }))
	(let
		(
			(current-nonce (var-get burn-request-nonce))
			(id (if (is-some (map-get? burn-requests request-id)) request-id (begin (var-set burn-request-nonce (+ current-nonce u1)) current-nonce)))
		)
		(try! (is-dao-or-extension))
		(map-set burn-requests id details)
		(ok id)))	

(define-public (transfer-fixed (amount uint) (recipient principal) (token-trait <sip-010-extensions-trait>))
    (begin 
        (try! (is-dao-or-extension))
        (as-contract (contract-call? token-trait transfer-fixed amount tx-sender recipient none))))

(define-public (stx-transfer (amount uint) (recipient principal))
	(begin 
		(try! (is-dao-or-extension))
		(as-contract (stx-transfer? amount tx-sender recipient))))