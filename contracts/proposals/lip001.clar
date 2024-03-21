
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin		
		(try! (contract-call? .lisa-dao set-extensions (list
			{ extension: .lqstx-mint-endpoint-v1-01, enabled: false }
			{ extension: .lqstx-mint-endpoint-v1-02, enabled: true }
			{ extension: .lisa-rebase, enabled: false }
			{ extension: .rebase-1, enabled: false }
			{ extension: .lisa-rebase-v1-02, enabled: true }
			{ extension: .rebase-1-v1-02, enabled: true }
		)))

		(try! (contract-call? .token-lqstx dao-set-name "Liberate your STX"))
		(try! (contract-call? .token-lqstx dao-set-symbol "liSTX"))
		(try! (contract-call? .token-vlqstx dao-set-name "Vault your liSTX"))
		(try! (contract-call? .token-vlqstx dao-set-symbol "vliSTX"))

		;; Enable whitelist
		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-use-whitelist true))
		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-whitelisted-many 
			(list 
				'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7
				'SP2VZBR9GCVM33BN0WXA05VJP6QV7CJ3Z3SQKJ5HH
				'SP12BFYTH3NJ6N63KE0S50GHSYV0M91NGQND2B704
				'SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B
				'SPFJVM9Y1A4KJ31T8ZBDESZH36YGPDAZ9WXEFC53
				'SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25
			)
			(list 
				true
				true
				true
				true
				true
				true
			)))
		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-paused false))		
		(ok true)
	)
)
