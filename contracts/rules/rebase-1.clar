(define-public (rebase)
	(contract-call? .lisa-rebase rebase (list .stacking-pool-strategy))
)
