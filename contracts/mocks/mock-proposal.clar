
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin		
		(try! (contract-call? .operators set-operators (list
			{operator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM, enabled: false}
		)))
		(ok true)
	)
)
