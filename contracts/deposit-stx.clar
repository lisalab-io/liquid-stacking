
(define-constant err-unauthorised (err u1000))
(define-constant err-invalid-request-id (err u1001))

(define-data-var withdrawal-requests-nonce uint u0)
(define-map withdrawal-requests uint {recipient: principal, amount: uint})

(define-public (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender .lisa-dao) (contract-call? .lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-public (deposit-stx (amount uint))
	(begin
		(try! (stx-transfer? amount tx-sender .vault))
		(contract-call? .token-lqstx dao-mint amount tx-sender)
	)
)

(define-public (request-withdraw-stx (amount uint))
	(let ((vault-balance (stx-get-balance .vault)))
		(try! (contract-call? .token-lqstx dao-burn amount tx-sender))
		(if (>= vault-balance amount)
			(begin
				(try! (contract-call? .vault dynamic-transfer .stx-transfer-provider (unwrap-panic (to-consensus-buff? { ustx: amount, recipient: tx-sender }))))
				(ok none)
			)
		;;else
			(let ((nonce (var-get withdrawal-requests-nonce)))
				(map-set withdrawal-requests nonce {recipient: tx-sender, amount: amount})
				(var-set withdrawal-requests-nonce (+ nonce u1))
				(ok (some nonce))
			)
		)
	)
)

(define-public (settle-withdraw-stx (request-id uint))
	(let ((request (unwrap! (map-get? withdrawal-requests request-id) err-invalid-request-id)))
		(map-delete withdrawal-requests request-id)
		(contract-call? .vault dynamic-transfer .stx-transfer-provider (unwrap-panic (to-consensus-buff? { ustx: (get amount request), recipient: (get recipient request) })))
	)
)

(define-public (settle-withdraw-stx-many (request-ids (list 200 uint)))
	(ok (map settle-withdraw-stx request-ids))
)
