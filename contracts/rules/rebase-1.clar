(define-public (rebase)
	(contract-call? .lisa-rebase rebase (list .fastpool-strategy))
)
