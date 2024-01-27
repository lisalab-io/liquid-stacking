;;
;; lqstx-mint-registry
;;

(use-trait sip-010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)
(use-trait sip-010-extensions-trait .sip-010-extensions-trait.sip-010-extensions-trait)
(use-trait stacking-trait .trait-stacking.stacking-trait)

(define-constant err-unauthorised (err u1000))
(define-constant ERR-UNKNOWN-REQUEST-ID (err u1008))
(define-constant ERR-UNKNOWN-VAULT (err u1009))

(define-constant PENDING u0)
(define-constant FINALIZED u1)
(define-constant REVOKED u2)

(define-map approved-stacking-vault principal bool)

(define-data-var rewards-paid-upto uint u0)

(define-data-var mint-request-nonce uint u0)
(define-data-var burn-request-nonce uint u0)

(define-map mint-requests uint { requested-by: principal, amount: uint, requested-at: uint, status: uint })
(define-map burn-requests uint { requested-by: principal, amount: uint, requested-at: uint, status: uint })

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

;; read-only calls

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
	(ok (unwrap! (map-get? mint-requests request-id) ERR-UNKNOWN-REQUEST-ID)))

(define-read-only (get-burn-request-or-fail (request-id uint))
	(ok (unwrap! (map-get? burn-requests request-id) ERR-UNKNOWN-REQUEST-ID)))	

(define-read-only (get-approved-stacking-vault-or-default (vault principal))
	(default-to false (map-get? approved-stacking-vault vault)))

;; governance calls

;; @dev other pools can be added by adding stacking vault that implements stacking-trait
(define-public (set-approved-stacking-vault (vault-trait <stacking-trait>) (approved bool))
    (begin 
        (try! (is-dao-or-extension))
        (ok (map-set approved-stacking-vault (contract-of vault-trait) approved))))

;; privileged calls

(define-public (set-rewards-paid-upto (cycle uint))
	(begin 
		(try! (is-dao-or-extension))
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

(define-public (delegate-stx (amount uint) (vault-trait <stacking-trait>))
	(begin 
		(try! (is-dao-or-extension))
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		;;(as-contract (try! (contract-call? .token-wstx transfer-fixed amount tx-sender (contract-of vault-trait) none)))
		(as-contract (contract-call? vault-trait delegate-stx (/ amount u100)))))

(define-public (delegate-stack-stx (vault-trait <stacking-trait>))
	(begin
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		(contract-call? vault-trait delegate-stack-stx)))

(define-public (revoke-delegate-stx (vault-trait <stacking-trait>))
	(begin 
		(try! (is-dao-or-extension))
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		(as-contract (contract-call? vault-trait revoke-delegate-stx))))

(define-public (transfer-from-vault (amount uint) (vault-trait <stacking-trait>))
	(begin 
		(try! (is-dao-or-extension))
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		(as-contract (contract-call? vault-trait transfer-fixed amount tx-sender))))
	