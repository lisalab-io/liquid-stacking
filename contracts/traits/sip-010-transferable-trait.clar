(define-trait sip-010-transferable-trait
	(
		(transfer (uint principal principal (optional (buff 2048))) (response bool uint))
	)
)
