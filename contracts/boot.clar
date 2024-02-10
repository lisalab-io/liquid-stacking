(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{extension: .deposit-stx, enabled: true}
			{extension: .vault, enabled: true}
			{extension: .fastpool-strategy-manager, enabled: true}
		)))
		(ok true)
	)
)
