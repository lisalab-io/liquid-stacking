;;
;; lqstx-mint-registry
;;

(use-trait sip010-trait .trait-sip-010.sip-010-trait)
(use-trait stacking-trait .trait-stacking.stacking-trait)

(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-UNKNOWN-REQUEST-ID (err u1008))
(define-constant ERR-UNKNOWN-VAULT (err u1009))

(define-constant PENDING u0)
(define-constant FINALIZED u1)
(define-constant REVOKED u2)

(define-data-var contract-owner principal tx-sender)
(define-map approved-operators principal bool)

(define-map approved-stacking-vault principal bool)

(define-data-var rewards-paid-upto uint u0)

(define-data-var mint-request-nonce uint u0)
(define-data-var burn-request-nonce uint u0)

(define-map mint-requests uint { requested-by: principal, amount: uint, requested-at: uint, status: uint })
(define-map burn-requests uint { requested-by: principal, amount: uint, requested-at: uint, status: uint })

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

(define-read-only (get-approved-operator-or-default (operator principal))
	(default-to false (map-get? approved-operators operator)))

(define-read-only (get-mint-request-or-fail (request-id uint))
	(ok (unwrap! (map-get? mint-requests request-id) ERR-UNKNOWN-REQUEST-ID)))

(define-read-only (get-burn-request-or-fail (request-id uint))
	(ok (unwrap! (map-get? burn-requests request-id) ERR-UNKNOWN-REQUEST-ID)))	

(define-read-only (is-approved-operator)
	(ok (asserts! (or (get-approved-operator-or-default tx-sender) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)))

(define-read-only (get-approved-stacking-vault-or-default (vault principal))
	(default-to false (map-get? approved-stacking-vault vault)))

;; governance calls

(define-public (set-contract-owner (owner principal))
	(begin
		(try! (check-is-owner))
		(ok (var-set contract-owner owner))))

(define-public (set-approved-operator (operator principal) (approved bool))
    (begin 
        (try! (check-is-owner))
        (ok (map-set approved-operators operator approved))))

;; @dev other pools can be added by adding stacking vault that implements stacking-trait
(define-public (set-approved-stacking-vault (vault-trait <stacking-trait>) (approved bool))
    (begin 
        (try! (check-is-owner))
        (ok (map-set approved-stacking-vault (contract-of vault-trait) approved))))

;; privileged calls

(define-public (set-rewards-paid-upto (cycle uint))
	(begin 
		(try! (is-approved-operator))
		(ok (var-set rewards-paid-upto cycle))))

(define-public (set-mint-request (request-id uint) (details { requested-by: principal, amount: uint, requested-at: uint, status: uint }))
	(let
		(
			(current-nonce (var-get mint-request-nonce))
			(id (if (is-some (map-get? mint-requests request-id)) request-id (begin (var-set mint-request-nonce (+ current-nonce u1)) current-nonce)))
		)
		(try! (is-approved-operator))
		(map-set mint-requests id details)
		(ok id)))

(define-public (set-burn-request (request-id uint) (details { requested-by: principal, amount: uint, requested-at: uint, status: uint }))
	(let
		(
			(current-nonce (var-get burn-request-nonce))
			(id (if (is-some (map-get? burn-requests request-id)) request-id (begin (var-set burn-request-nonce (+ current-nonce u1)) current-nonce)))
		)
		(try! (is-approved-operator))
		(map-set burn-requests id details)
		(ok id)))	

(define-public (transfer-fixed (amount uint) (recipient principal) (token-trait <sip010-trait>))
    (begin 
        (try! (is-approved-operator))
        (as-contract (contract-call? token-trait transfer-fixed amount tx-sender recipient none))))

(define-public (delegate-stx (amount uint) (vault-trait <stacking-trait>))
	(begin 
		(try! (is-approved-operator))
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		(as-contract (try! (contract-call? .token-wstx transfer-fixed amount tx-sender (contract-of vault-trait) none)))
		(as-contract (contract-call? vault-trait delegate-stx (/ amount u100)))))

(define-public (delegate-stack-stx (vault-trait <stacking-trait>))
	(begin
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		(contract-call? vault-trait delegate-stack-stx)))

(define-public (revoke-delegate-stx (vault-trait <stacking-trait>))
	(begin 
		(try! (is-approved-operator))
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		(as-contract (contract-call? vault-trait revoke-delegate-stx))))

(define-public (transfer-from-vault (amount uint) (vault-trait <stacking-trait>))
	(begin 
		(try! (is-approved-operator))
		(asserts! (get-approved-stacking-vault-or-default (contract-of vault-trait)) ERR-UNKNOWN-VAULT)
		(as-contract (contract-call? vault-trait transfer-fixed amount tx-sender))))

;; private calls

(define-private (check-is-owner)
	(ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)))