(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{extension: .lqstx-mint-endpoint, enabled: true}
			{extension: .lqstx-vault, enabled: true}
			{extension: .treasury, enabled: true}
			{extension: .token-vesting, enabled: true}
			{extension: .stacking-pool-strategy-manager, enabled: true}
			{extension: .lisa-rebase, enabled: true}
			{extension: .rebase-1, enabled: true}
			{extension: .operators, enabled: true}
		)))
		
		;; Set initial operators
		(try! (contract-call? .operators set-operators (list
			;; three from ALEX
			{ operator: 'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7, enabled: true }
			{ operator: 'SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25, enabled: true }
			{ operator: 'SPSZ26REB731JN8H00TD010S600F4AB4Z8F0JRB7, enabled: true }
			;; three from Ryder/FAST Pool
			{ operator: 'SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704, enabled: true }
			{ operator: 'SP1ZPTDQ3801C1AYEZ37NJWNDZ3HM60HC2TCFP228, enabled: true }
			{ operator: 'SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B, enabled: true }
		)))
		;; Set operator signal threshold, i.e. 4-of-6
		(try! (contract-call? .operators set-proposal-threshold 4))

		;; Set initial strategy managers, sender is the deployer
		(try! (contract-call? .stacking-pool-strategy-manager set-authorised-manager sender true))

		;; Mint max LISA token supply (1bn)
		(try! (contract-call? .token-lisa dao-mint-many (list
			{ recipient: .treasury, amount: u1000000000000000 }
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
