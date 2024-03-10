(define-trait rebase-strategy-trait
	(
		(rebase () (response uint uint))
		(finalize-mint (uint) (response bool uint))
		(finalize-burn (uint) (response bool uint))
		(request-burn (uint) (response { request-id: uint, status: (buff 1) } uint))
	)
)

