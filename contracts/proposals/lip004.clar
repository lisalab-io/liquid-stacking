
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin
		(try! (contract-call? .lisa-dao set-extensions (list
			{ extension: .lqstx-mint-endpoint-v1-02, enabled: false }
			{ extension: .auto-whitelist-mint-helper, enabled: false }
			{ extension: .public-pools-strategy-manager, enabled: false}
			{ extension: .lqstx-mint-endpoint-v2-01, enabled: true }
			{ extension: .public-pools-strategy-manager-v2, enabled: true})))

		(try! (contract-call? .lqstx-mint-endpoint-v1-02 set-paused true))
		(try! (contract-call? .lqstx-mint-endpoint-v2-01 set-paused false))

		(try! (contract-call? .public-pools-strategy-manager-v2 set-authorised-manager 'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7 true))
		(try! (contract-call? .public-pools-strategy-manager-v2 set-authorised-manager 'SPGAB1P3YV109E22KXFJYM63GK0G21BYX50CQ80B true))
		(ok true)
	)
)
