
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao set-extensions (list
			{ extension: .auto-alex-v3-endpoint, enabled: true }
		)))

		(try! (contract-call? .auto-alex-v3-registry set-start-cycle u0))
		(try! (contract-call? .auto-alex-v3-endpoint pause-create false))
		(try! (contract-call? .auto-alex-v3-endpoint pause-redeem false))
        
		(ok true)
	)
)
