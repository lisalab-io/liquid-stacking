
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao set-extensions (list
			{ extension: .lqstx-mint-endpoint-v1-02, enabled: true }
			{ extension: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault, enabled: true }
			{ extension: .endpoint-whitelist-helper-v1-02, enabled: true }
			{ extension: .auto-whitelist-mint-helper, enabled: true }
			{ extension: .treasury, enabled: true }
			{ extension: .token-vesting, enabled: true }
			{ extension: .operators, enabled: true }
			{ extension: .mock-strategy-manager, enabled: true }
		)))

		;; Set initial operators
		(try! (contract-call? .operators set-operators (list
			{operator: tx-sender, enabled: true}
			{operator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM, enabled: true}
			{operator: 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND, enabled: true}
			{operator: 'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB, enabled: true}
		)))
		(try! (contract-call? .operators set-proposal-threshold 2))

		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-paused false))
		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-mint-delay u14))
		(try! (contract-call? .mock-strategy-manager set-authorised-manager 'ST2QXSK64YQX3CQPC530K79XWQ98XFAM9W3XKEH3N true))
		(try! (contract-call? .mock-strategy-manager set-authorised-manager 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND true))
		(try! (contract-call? .endpoint-whitelist-helper-v1-02 set-authorised-operator 'ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE true))
		(ok true)
	)
)
