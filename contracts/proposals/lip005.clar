
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin		
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx dao-burn u1325539144828 'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.alex-vault-v1-1))
		(ok true)
	)
)
