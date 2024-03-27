
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao set-extensions (list
			{ extension: .lqstx-mint-endpoint, enabled: false }
			{ extension: .lqstx-mint-endpoint-v1-02, enabled: true }
			{ extension: 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault, enabled: true }
			{ extension: .treasury, enabled: true }
			{ extension: .token-vesting, enabled: true }
			{ extension: .public-pools-strategy-manager, enabled: true }
			{ extension: .operators, enabled: true }
		)))
		
		;; Set initial operators
		(try! (contract-call? .operators set-operators (list
			{operator: tx-sender, enabled: true}
			{operator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM, enabled: true}
			{operator: 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND, enabled: true}
			{operator: 'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB, enabled: true}
		)))
		(try! (contract-call? .operators set-proposal-threshold 2))

		;; Mint max LISA token supply (1bn)
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lisa dao-mint-many (list
			{ recipient: .treasury, amount: u1000000000000000 }
		)))

		;; Set initial strategy managers, sender is the deployer
		(try! (contract-call? .public-pools-strategy-manager set-authorised-manager sender true))
		(try! (contract-call? .public-pools-strategy-manager set-authorised-manager 'ST2QXSK64YQX3CQPC530K79XWQ98XFAM9W3XKEH3N true))
		(try! (contract-call? .public-pools-strategy-manager set-authorised-manager 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND true))		

		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-paused false))
		(ok true)
	)
)
