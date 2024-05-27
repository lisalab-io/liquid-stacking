
;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.proposal-trait.proposal-trait)

(define-public (execute (sender principal))
	(let ((amount (unwrap-panic (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx get-balance 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.treasury))))
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.treasury sip010-transfer 
			amount 
			'SP3K8BC0PPEVCV7NZ6QSRWPQ2JE9E5B6N3PA0KBR9.executor-dao 
			none
			'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.token-lqstx
			))

		;; Set initial operators
		(try! (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.operators set-operators (list
			{ operator: 'SP3BQ65DRM8DMTYDD5HWMN60EYC0JFS5NC2V5CWW7, enabled: false }
			{ operator: 'SPHFAXDZVFHMY8YR3P9J7ZCV6N89SBET203ZAY25, enabled: false }
			{ operator: 'SPSZ26REB731JN8H00TD010S600F4AB4Z8F0JRB7, enabled: false }
			{ operator: 'SP1E0XBN9T4B10E9QMR7XMFJPMA19D77WY3KP2QKC, enabled: true }
			{ operator: 'SP1ESCTF9029MH550RKNE8R4D62G5HBY8PBBAF2N8, enabled: true }
			{ operator: 'SP1EF1PKR40XW37GDC0BP7SN4V4JCVSHSDVG71YTH, enabled: true }
		)))		
		(ok true)
	)
)
