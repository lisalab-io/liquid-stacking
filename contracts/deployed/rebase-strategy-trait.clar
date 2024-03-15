
;; SPDX-License-Identifier: BUSL-1.1

(define-trait rebase-strategy-trait
	(
		(rebase () (response uint uint))
		(finalize-mint (uint) (response bool uint))
		(finalize-burn (uint) (response bool uint))
	)
)

