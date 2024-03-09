(impl-trait .proposal-trait.proposal-trait)

(define-constant stx-bootstrap-amount u10000)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{extension: .lqstx-mint-endpoint, enabled: true}
			{extension: .lqstx-vault, enabled: true}
			{extension: .treasury, enabled: true}
			{extension: .stacking-pool-strategy-manager, enabled: true}
			{extension: .lisa-rebase, enabled: true}
			{extension: .rebase-1, enabled: true}
			{extension: .operators, enabled: true}			
		)))
		
		;; Set initial operators
		(try! (contract-call? .operators set-operators (list
			{operator: tx-sender, enabled: true}
		)))
		;; Set operator signal threshold
		(try! (contract-call? .operators set-proposal-threshold 2))

		;; Set initial Fastpool strategy managers
		(try! (contract-call? .stacking-pool-strategy-manager set-authorised-manager tx-sender true))

		;; Mint initial LISA token supply
		(try! (contract-call? .token-lisa dao-mint-many (list
			{recipient: .treasury, amount: u100000000000000}
		)))

		;; Note: tx-sender is .lisa-dao
		(try! (stx-transfer? stx-bootstrap-amount tx-sender .treasury))
		(ok true)
	)
)
