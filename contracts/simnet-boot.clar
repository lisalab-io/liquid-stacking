
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{ extension: .lqstx-mint-endpoint, enabled: false }
			{ extension: .lqstx-mint-endpoint-v1-02, enabled: true }
			{ extension: .lqstx-vault, enabled: true }
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

		;; Set initial strategy managers, sender is the deployer
		(try! (contract-call? .public-pools-strategy-manager set-authorised-manager sender true))

		;; Mint max LISA token supply (1bn)
		(try! (contract-call? .token-lisa dao-mint-many (list
			{ recipient: .treasury, amount: u1000000000000000 }
		)))
		
		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-paused false))
		(ok true)
	)
)
