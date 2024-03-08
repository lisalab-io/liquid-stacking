(define-public (rebase)
	(as-contract (contract-call? .lisa-rebase rebase (list .mock-strategy))))

(define-public (finalize-mint (request-id uint))
	(begin 
		(try! (rebase))
		(as-contract (try! (contract-call? .lqstx-mint-endpoint finalize-mint request-id)))
		(try! (rebase))
		(ok true)))

(define-public (finalize-burn (request-id uint))
	(begin 
		(try! (rebase))
		(as-contract (try! (contract-call? .lqstx-mint-endpoint finalize-burn request-id)))
		(try! (rebase))
		(ok true)))
	
(define-public (callback (extension principal) (payload (buff 2048)))
    (ok true))