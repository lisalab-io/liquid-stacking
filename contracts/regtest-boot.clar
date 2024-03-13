(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{extension: .lqstx-mint-endpoint, enabled: false}
			{extension: .lqstx-mint-endpoint-v1-01, enabled: true}
			{extension: .lisa-rebase, enabled: true}
			{extension: .rebase-mock, enabled: true}
			{extension: .mock-strategy-manager, enabled: true}
			{extension: .lqstx-vault, enabled: true}
			{extension: .operators, enabled: true}			
		)))
		
		;; Set initial operators
		(try! (contract-call? .operators set-operators (list
			{operator: tx-sender, enabled: true}	
			{operator: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM, enabled: true}
			{operator: 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND, enabled: true}
		)))
		(try! (contract-call? .operators set-proposal-threshold 2))
		
		(try! (contract-call? .lqstx-mint-endpoint-v1-01 set-paused false))
		(try! (contract-call? .lqstx-mint-endpoint-v1-01 set-mint-delay u14))
		(try! (contract-call? .mock-strategy-manager set-authorised-manager 'ST2QXSK64YQX3CQPC530K79XWQ98XFAM9W3XKEH3N true))
		(try! (contract-call? .mock-strategy-manager set-authorised-manager 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND true))
		(ok true)
	)
)
