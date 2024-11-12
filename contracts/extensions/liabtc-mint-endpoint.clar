
;; SPDX-License-Identifier: BUSL-1.1

;; __IF_MAINNET__
(use-trait sip-010-trait 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait)
;; (use-trait sip-010-trait .sip-010-trait.sip-010-trait)
;; __ENDIF__

(define-constant err-unauthorised (err u3000))
(define-constant err-paused (err u7001))
(define-constant err-request-pending (err u7006))
(define-constant err-request-finalized-or-revoked (err u7007))
(define-constant err-not-whitelisted (err u7008))

(define-constant PENDING 0x00)
(define-constant FINALIZED 0x01)
(define-constant REVOKED 0x02)

(define-data-var paused bool true)
(define-data-var burn-delay uint u1152) ;; 1,008 + 144 Bitcoin blocks

(define-data-var use-whitelist bool false)
(define-map whitelisted principal bool)

;; read-only calls

(define-read-only (is-dao-or-extension)
    (ok (asserts! (or (is-eq tx-sender 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.executor-dao) (contract-call? 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.executor-dao is-extension contract-caller)) err-unauthorised)))

(define-read-only (is-paused)
    (var-get paused))

(define-read-only (is-not-paused-or-fail)
    (ok (asserts! (not (is-paused)) err-paused)))

(define-read-only (get-burn-request-or-fail (request-id uint))
    (contract-call? .liabtc-mint-registry get-burn-request-or-fail request-id))

(define-read-only (get-burn-requests-pending-or-default (user principal))
    (contract-call? .liabtc-mint-registry get-burn-requests-pending-or-default user))

(define-read-only (get-burn-request-or-fail-many (request-ids (list 1000 uint)))
    (ok (map get-burn-request-or-fail request-ids)))

(define-read-only (get-burn-delay)
    (var-get burn-delay))

(define-read-only (is-whitelisted-or-mint-for-all (user principal))
    (or (not (var-get use-whitelist)) (default-to false (map-get? whitelisted user))))

;; public calls

(define-public (rebase)
	(let (
			(shares (contract-call? .xlink-staking get-shares-or-default (as-contract tx-sender) 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc))
			(amount (contract-call? .xlink-staking get-amount-given-shares 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc shares)))
		(contract-call? .token-liabtc set-reserve amount)))

(define-public (mint 
	(amount uint) 
	(message { token: principal, accrued-rewards: uint, timestamp: uint })
	(signature-packs (list 100 { signer: principal, message-hash: (buff 32), signature: (buff 65) })))
  (begin
    (try! (is-not-paused-or-fail))
    (asserts! (is-whitelisted-or-mint-for-all tx-sender) err-not-whitelisted)
		(try! (rebase))
		(try! (contract-call? 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc transfer amount tx-sender (as-contract tx-sender) none))
		(as-contract (try! (contract-call? .xlink-staking stake 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc amount message signature-packs)))
		(try! (contract-call? .token-liabtc dao-mint amount tx-sender))
    (print { type: "mint", amount: amount, message: message })
    (ok (try! (rebase)))))

(define-public (request-burn 
	(amount uint)
	(message { token: principal, accrued-rewards: uint, timestamp: uint })
	(signature-packs (list 100 { signer: principal, message-hash: (buff 32), signature: (buff 65) })))	
  (let (
    (request-details { requested-by: tx-sender, amount: amount, requested-at: burn-block-height, status: PENDING })
    (request-id (try! (contract-call? .liabtc-mint-registry set-burn-request u0 request-details))))
		(try! (is-not-paused-or-fail))
		(try! (rebase))        
		(try! (contract-call? .token-liabtc dao-burn amount tx-sender))
		(as-contract (try! (contract-call? .xlink-staking unstake 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc amount message signature-packs)))		
		(as-contract (try! (contract-call? 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc transfer amount tx-sender .liabtc-mint-registry none)))        
		(try! (rebase))
		(print { type: "burn-request", id: request-id, details: request-details })
    (ok { request-id: request-id, status: PENDING })))

(define-public (revoke-burn 
	(request-id uint)
	(message { token: principal, accrued-rewards: uint, timestamp: uint })
	(signature-packs (list 100 { signer: principal, message-hash: (buff 32), signature: (buff 65) })))	
  (let (
			(sender tx-sender)
			(request-details (try! (get-burn-request-or-fail request-id)))
      (merged-request-details (merge request-details { status: REVOKED })))
    (try! (is-not-paused-or-fail))
		(try! (rebase))
    (asserts! (is-eq PENDING (get status request-details)) err-request-finalized-or-revoked)
    (asserts! (is-eq sender (get requested-by request-details)) err-unauthorised)
		(as-contract (try! (contract-call? .liabtc-mint-registry transfer (get amount request-details) sender 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc)))
		(try! (contract-call? .liabtc-mint-registry set-burn-request request-id merged-request-details))
    (print { type: "burn-revoke", id: request-id, details: merged-request-details })
		(mint (get amount request-details) message signature-packs)))

(define-public (finalize-burn (request-id uint))
	(let (
			(sender tx-sender)          
      (request-details (try! (get-burn-request-or-fail request-id)))
      (merged-request-details (merge request-details { status: FINALIZED })))
    (try! (is-not-paused-or-fail))
		(asserts! (>= burn-block-height (+ (get requested-at request-details) (var-get burn-delay))) err-request-pending)
		(as-contract (try! (contract-call? .liabtc-mint-registry transfer (get amount request-details) sender 'SP2XD7417HGPRTREMKF748VNEQPDRR0RMANB7X1NK.token-abtc)))
    (try! (contract-call? .liabtc-mint-registry set-burn-request request-id merged-request-details))
    (print { type: "burn-finalize", id: request-id, details: merged-request-details })
    (try! (rebase))
    (ok true)))

(define-public (finalize-burn-many (request-ids (list 1000 uint)))
  (ok (map finalize-burn request-ids)))

;; governance calls

(define-public (set-use-whitelist (new-use bool))
  (begin
  	(try! (is-dao-or-extension))
    (ok (var-set use-whitelist new-use))))

(define-public (set-whitelisted (user principal) (new-whitelisted bool))
  (begin
    (try! (is-dao-or-extension))
    (set-whitelisted-private user new-whitelisted)))

(define-public (set-whitelisted-many (users (list 1000 principal)) (new-whitelisteds (list 1000 bool)))
  (begin
    (try! (is-dao-or-extension))
    (fold check-err (map set-whitelisted-private users new-whitelisteds) (ok true))))

(define-public (set-paused (new-paused bool))
  (begin
    (try! (is-dao-or-extension))
    (ok (var-set paused new-paused))))

(define-public (set-burn-delay (new-delay uint))
  (begin
    (try! (is-dao-or-extension))
    (ok (var-set burn-delay new-delay))))

;; privileged calls

;; private calls

(define-private (check-err (result (response bool uint)) (prior (response bool uint)))
  (match prior ok-value result err-value (err err-value)))

(define-private (set-whitelisted-private (user principal) (new-whitelisted bool))
  (ok (map-set whitelisted user new-whitelisted)))


