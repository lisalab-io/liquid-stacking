(impl-trait .proposal-trait.proposal-trait)

(define-constant stx-bootstrap-amount u10000)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{extension: .lqstx-mint-endpoint, enabled: true}
			{extension: .lqstx-vault, enabled: true}
			{extension: .treasury, enabled: true}
			{extension: .fastpool-strategy-manager, enabled: true}
			{extension: .lisa-rebase, enabled: true}
			{extension: .rebase-1, enabled: true}
			{extension: .operators, enabled: true}			
		)))
		
		;; Set initial operators
		(try! (contract-call? .operators set-operators (list
			{operator: tx-sender, enabled: true}
			;; {operator: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5, enabled: true}
			;; {operator: 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG, enabled: true}
			;; two from ALEX
			{ operator: 'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7, enabled: true }
			{ operator: 'SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25, enabled: true }
			;; two from Ryder/FAST Pool
		)))
		;; Set operator signal threshold
		(try! (contract-call? .operators set-proposal-threshold 3))

		;; Set initial Fastpool strategy managers
		(try! (contract-call? .fastpool-strategy-manager set-authorised-manager tx-sender true))

		;; Mint initial LISA token supply
		(try! (contract-call? .token-lisa dao-mint-many (list
			{recipient: .treasury, amount: u100000000000000}
		)))	

		;; Enable whitelist
		(try! (contract-call? .lqstx-mint-endpoint set-use-whitelist true))
		(try! (contract-call? .lqstx-mint-endpoint set-whitelisted-many 
			(list 
				'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7
				'SP2VZBR9GCVM33BN0WXA05VJP6QV7CJ3Z3SQKJ5HH
			) 
			(list 
				true
				true
			)))

		(ok true)
	)
)
