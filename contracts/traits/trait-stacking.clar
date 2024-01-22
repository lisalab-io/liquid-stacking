(define-trait stacking-trait
	(
		(delegate-stx (uint) (response bool uint))
		(delegate-stack-stx () (response { stacker: principal, lock-amount: uint, unlock-burn-height: uint } uint))
		(revoke-delegate-stx () (response bool uint))
		(transfer-fixed (uint principal) (response bool uint))
	)
)
