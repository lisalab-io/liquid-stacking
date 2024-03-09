(define-public (rebase)
	(contract-call? .lisa-rebase rebase (list .public-pools-strategy))
)
