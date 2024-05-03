
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait .proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(begin		
		(try! (contract-call? .lisa-dao set-extension .auto-whitelist-mint-helper true))
		(ok true)
	)
)
