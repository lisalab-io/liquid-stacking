;; FAST Pool vault

(use-trait sip010-trait .trait-sip-010.sip-010-trait)

(define-constant ERR-NOT-AUTHORIZED (err u1000))

(define-data-var contract-owner principal tx-sender)
(define-map approved-operators principal bool)

;; read-only calls

(define-read-only (get-approved-operator-or-default (operator principal))
	(default-to false (map-get? approved-operators operator)))

(define-read-only (is-approved-operator)
	(ok (asserts! (or (get-approved-operator-or-default tx-sender) (is-ok (check-is-owner))) ERR-NOT-AUTHORIZED)))

;; governance calls

(define-public (set-contract-owner (owner principal))
	(begin
		(try! (check-is-owner))
		(ok (var-set contract-owner owner))))

(define-public (set-approved-operator (operator principal) (approved bool))
    (begin 
        (try! (check-is-owner))
        (ok (map-set approved-operators operator approved))))

;; previliged calls

(define-public (transfer-fixed (amount uint) (recipient principal))
    (begin 
        (try! (is-approved-operator))
        (as-contract (contract-call? .token-wstx transfer-fixed amount tx-sender recipient none))))

;; @dev other pools can be added by upgrading registry
(define-public (delegate-stx (amount uint))
	(begin 
		(try! (is-approved-operator))
		(as-contract (contract-call? 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 delegate-stx (/ amount u100)))))

;; @dev other pools can be added by upgrading registry
(define-public (delegate-stack-stx)
	(contract-call? 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 delegate-stack-stx (as-contract tx-sender)))

(define-public (disallow-fast-pool (caller principal))
	(begin 
		(try! (is-approved-operator))
		(to-response-uint (as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-3 disallow-contract-caller 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2)))))


(define-public (revoke-delegate-stx)
	(begin 
		(try! (is-approved-operator))
		(to-response-uint (as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-3 revoke-delegate-stx)))))

;; private calls

(define-private (check-is-owner)
	(ok (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-AUTHORIZED)))

(define-private (to-response-uint (resp (response bool int)))
	(match resp success (ok success) err (err (to-uint err))))

;; initialisation

(as-contract (contract-call? 'ST000000000000000000002AMW42H.pox-3 allow-contract-caller 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 none))