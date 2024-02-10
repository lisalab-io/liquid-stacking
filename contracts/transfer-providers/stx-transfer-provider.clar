(impl-trait .transfer-provider-trait.transfer-provider-trait)

(define-constant err-invalid-payload (err u4000))

(define-public (dynamic-transfer (payload (buff 512)))
	(let ((decoded (unwrap! (from-consensus-buff? { ustx: uint, recipient: principal } payload) err-invalid-payload)))
		(stx-transfer? (get ustx decoded) tx-sender (get recipient decoded))
	)
)
