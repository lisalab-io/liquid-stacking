
;; SPDX-License-Identifier: BUSL-1.1

(define-constant err-unauthorised (err u3000))
(define-constant err-still-alive (err u3001))

(define-constant dms-activation-period u12960) ;; ~90 days

(define-map authorised-managers principal bool)
(map-set authorised-managers tx-sender true)

(define-data-var last-manager-action-height uint burn-block-height)

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao) (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-read-only (is-authorised-manager (who principal))
	(default-to false (map-get? authorised-managers who))
)

(define-public (fund-strategy (amounts (list 20 uint)))
	(begin
		(asserts! (is-authorised-manager tx-sender) err-unauthorised)
		(var-set last-manager-action-height burn-block-height)
		(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault fund-strategy 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.public-pools-strategy-v2 (unwrap-panic (to-consensus-buff? amounts)))
	)
)

(define-public (refund-strategy (selection (list 20 bool)))
	(begin
		(asserts! (is-authorised-manager tx-sender) err-unauthorised)
		(var-set last-manager-action-height burn-block-height)
		(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault refund-strategy 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.public-pools-strategy-v2 (unwrap-panic (to-consensus-buff? selection)))
	)
)

(define-public (keep-alive)
	(begin
		(asserts! (is-authorised-manager tx-sender) err-unauthorised)
		(ok (var-set last-manager-action-height burn-block-height))
	)
)

(define-public (set-authorised-manager (who principal) (enabled bool))
	(begin
		(try! (is-dao-or-extension))
		(ok (map-set authorised-managers who enabled))
	)
)

;; Dead Man's switch

(define-read-only (dms-active)
	(ok (asserts! (< (+ (var-get last-manager-action-height) dms-activation-period) burn-block-height) err-still-alive))
)

(define-public (dms-revoke-strategy)
	(begin
		(try! (dms-active))
		(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault fund-strategy 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.public-pools-strategy-v2 (unwrap-panic (to-consensus-buff? (list u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0 u0))))
	)
)

(define-public (dms-refund-strategy)
	(begin
		(try! (dms-active))
		(contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lqstx-vault refund-strategy 'SM3KNVZS30WM7F89SXKVVFY4SN9RMPZZ9FX929N0V.public-pools-strategy-v2 (unwrap-panic (to-consensus-buff? (list true true true true true true true true true true true true true true true true true true true true))))
	)
)
