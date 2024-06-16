
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{ extension: .auto-alex-v3-endpoint, enabled: true }
		)))

		(try! (contract-call? .auto-alex-v3-registry set-start-cycle u0))
		(try! (contract-call? .auto-alex-v3-endpoint pause-create false))
		(try! (contract-call? .auto-alex-v3-endpoint pause-redeem false))
        
		(ok true)
	)
)
