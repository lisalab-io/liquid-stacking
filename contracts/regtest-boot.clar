(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{extension: .lqstx-mint-endpoint, enabled: true}
			{extension: .lisa-rebase, enabled: true}
			{extension: .rebase-mock, enabled: true}
			{extension: .mock-strategy-manager, enabled: true}
			{extension: .lqstx-vault, enabled: true}
		)))
		(try! (contract-call? .lqstx-mint-endpoint set-paused false))
		(try! (contract-call? .lqstx-mint-endpoint set-reward-cycle-length u200))
		(try! (contract-call? .lqstx-mint-endpoint set-mint-delay u14))
		(try! (contract-call? .mock-strategy-manager set-authorised-manager 'ST2QXSK64YQX3CQPC530K79XWQ98XFAM9W3XKEH3N true))
		(try! (contract-call? .mock-strategy-manager set-authorised-manager 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND true))
		(ok true)
	)
)
