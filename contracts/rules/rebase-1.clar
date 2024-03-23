
;; SPDX-License-Identifier: BUSL-1.1


(define-constant PENDING 0x00)
(define-constant FINALIZED 0x01)
(define-constant REVOKED 0x02)

(define-public (rebase)
	(contract-call? .lisa-rebase-v1-02 rebase (list .public-pools-strategy))
)

(define-public (finalize-mint (request-id uint))
	(begin 
		(try! (rebase))
		(as-contract (try! (contract-call? .lqstx-mint-endpoint-v1-02 finalize-mint request-id)))
		(try! (rebase))
		(ok true)))

(define-public (finalize-burn (request-id uint))
	(begin 
		(try! (rebase))
		(as-contract (try! (contract-call? .lqstx-mint-endpoint-v1-02 finalize-burn request-id)))
		(try! (rebase))
		(ok true)))

(define-public (request-burn (amount uint))
	(let (
			(sender tx-sender))
		(try! (contract-call? .token-lqstx transfer amount sender (as-contract tx-sender) none))
		(as-contract (contract-call? .lqstx-mint-endpoint-v1-02 request-burn sender amount))))
