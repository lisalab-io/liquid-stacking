;; FAST Pool vault

(use-trait sip-010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)

(define-constant err-unauthorised (err u1000))

;; read-only calls

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

;; governance calls

(define-public (transfer-fixed (amount uint) (recipient principal))
    (begin 
        (try! (is-dao-or-extension))
        ;;(as-contract (contract-call? .token-wstx transfer-fixed amount tx-sender recipient none))
		(ok true)
		))

;; @dev other pools can be added by upgrading registry
(define-public (delegate-stx (amount uint))
	(begin 
		(try! (is-dao-or-extension))
		(as-contract (contract-call? 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 delegate-stx (/ amount u100)))))

;; @dev other pools can be added by upgrading registry
(define-public (delegate-stack-stx)
	(contract-call? 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 delegate-stack-stx (as-contract tx-sender)))

(define-public (disallow-fast-pool (caller principal))
	(begin 
		(try! (is-dao-or-extension))
		(to-response-uint (as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-3 disallow-contract-caller 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2)))))


(define-public (revoke-delegate-stx)
	(begin 
		(try! (is-dao-or-extension))
		(to-response-uint (as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-3 revoke-delegate-stx)))))

(define-private (to-response-uint (resp (response bool int)))
	(match resp success (ok success) err (err (to-uint err))))

;; initialisation

(as-contract (contract-call? 'SP000000000000000000002Q6VF78.pox-3 allow-contract-caller 'SP21YTSM60CAY6D011EZVEVNKXVW8FVZE198XEFFP.pox-fast-pool-v2 none))