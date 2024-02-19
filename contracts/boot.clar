(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		;; Enable core contracts
		(try! (contract-call? .lisa-dao set-extensions (list
			{extension: .lqstx-mint-endpoint, enabled: true}
			{extension: .lqstx-mint-registry, enabled: true}
			{extension: .vault, enabled: true}
			{extension: .treasury, enabled: true}
			{extension: .fastpool-strategy-manager, enabled: true}
			{extension: .lisa-rebase, enabled: true}
			{extension: .rebase-1, enabled: true}
			{extension: .operators, enabled: true}
		)))

		;; Set initial operators
		(try! (contract-call? .operators set-operators (list
			{operator: tx-sender, enabled: true}
			{operator: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, enabled: true}
			{operator: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG, enabled: true}
		)))
		;; Set operator signal threshold
		(try! (contract-call? .operators set-proposal-threshold 2))

		;; Set initial Fastpool strategy managers
		(try! (contract-call? .fastpool-strategy-manager set-authorised-manager tx-sender true))

		;; Mint initial LISA token supply
		(try! (contract-call? .token-lisa dao-mint-many (list
			{recipient: .treasury, amount: u100000000000000}
		)))
		(ok true)
	)
)
