
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait .proxy-trait.proxy-trait)

(define-constant err-invalid-payload (err u4000))

(define-public (proxy-call (payload (buff 2048)))
	(let ((decoded (unwrap! (from-consensus-buff? { amount: uint, recipient: principal, memo: (optional (buff 2048)) } payload) err-invalid-payload)))
		(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lisa transfer (get amount decoded) tx-sender (get recipient decoded) (get memo decoded))
	)
)
