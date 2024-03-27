
;; SPDX-License-Identifier: BUSL-1.1

(use-trait proxy-trait .proxy-trait.proxy-trait)

(define-constant err-unauthorised (err u1000))
(define-constant err-caller-not-recipient (err u9000))
(define-constant err-unknown-vesting-id (err u9001))
(define-constant err-event-not-vested (err u9002))
(define-constant err-event-already-claimed (err u9003))
(define-constant err-recipient-exists (err u9004))

(define-map recipient-ids principal uint)
(define-map recipient-principals uint principal)
(define-data-var recipient-id-nonce uint u0)

(define-map vesting-schedule
	{ recipient-id: uint, event-id: uint }
	{ amount: uint, unlock-timestamp: uint }
)

(define-read-only (is-dao-or-extension)
	(ok (asserts! (or (is-eq tx-sender 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao) (contract-call? 'SM26NBC8SFHNW4P1Y4DFH27974P56WN86C92HPEHH.lisa-dao is-extension contract-caller)) err-unauthorised))
)

(define-read-only (get-vesting-schedule (recipient-id uint) (event-id uint))
	(map-get? vesting-schedule { recipient-id: recipient-id, event-id: event-id })
)

(define-read-only (get-last-block-time)
	(unwrap-panic (get-block-info? time (- block-height u1)))
)

(define-read-only (get-recipient-from-id (recipient-id uint))
	(map-get? recipient-principals recipient-id)
)

(define-public (get-tokens (event-id uint))
	(let (
		(recipient-id (unwrap! (map-get? recipient-ids contract-caller) err-caller-not-recipient))
		(event (unwrap! (map-get? vesting-schedule { recipient-id: recipient-id, event-id: event-id }) err-unknown-vesting-id))
		(unlock-timestamp (get unlock-timestamp event))
		(amount (get amount event))
		)
		(asserts! (<= unlock-timestamp (get-last-block-time)) err-event-not-vested)
		(asserts! (> amount u0) err-event-already-claimed)
		(map-set vesting-schedule { recipient-id: recipient-id, event-id: event-id } { amount: u0, unlock-timestamp: unlock-timestamp })
		(transfer-out amount contract-caller)
	)
)

(define-private (get-tokens-many-iter (event-id uint) (previous-result (response bool uint)))
	(if (is-err previous-result)
		previous-result
		(get-tokens event-id)
	)
)

(define-public (get-tokens-many (event-ids (list 48 uint)))
	(fold get-tokens-many-iter event-ids (ok true))
)

(define-public (update-recipient-target (old-recipient-rarget principal) (new-recipient-target principal))
	(let ((recipient-id (unwrap! (map-get? recipient-ids old-recipient-rarget) err-caller-not-recipient)))
		(try! (is-dao-or-extension))
		(asserts! (is-none (map-get? recipient-ids new-recipient-target)) err-recipient-exists)
		(map-delete recipient-ids old-recipient-rarget)
		(map-set recipient-ids new-recipient-target recipient-id)
		(map-set recipient-principals recipient-id new-recipient-target)
		(ok true)
	)
)

(define-private (transfer-out (amount uint) (recipient principal))
	(as-contract (contract-call? .token-lisa transfer amount tx-sender recipient none))
)

(define-private (get-or-create-recipient-id (recipient principal))
	(match (map-get? recipient-ids recipient)
		id id
		(let ((current-nonce (var-get recipient-id-nonce)))
			(var-set recipient-id-nonce (+ current-nonce u1))
			(map-set recipient-ids recipient current-nonce)
			(map-set recipient-principals current-nonce recipient)
			current-nonce
		)
	)
)

(define-private (set-vesting-schedule-iter (entry { event-id: uint, amount: uint, unlock-timestamp: uint }) (recipient-id uint))
	(begin
		(map-set vesting-schedule
			{ recipient-id: recipient-id, event-id: (get event-id entry) }
			{ amount: (get amount entry), unlock-timestamp: (get unlock-timestamp entry) }
		)
		recipient-id
	)
)

(define-public (set-vesting-schedule (recipient principal) (schedule (list 48 { event-id: uint, amount: uint, unlock-timestamp: uint })))
	(begin
		(try! (is-dao-or-extension))
		(ok (fold set-vesting-schedule-iter schedule (get-or-create-recipient-id recipient)))
	)
)

(define-public (proxy-call (proxy <proxy-trait>) (payload (buff 2048)))
	(begin
		(try! (is-dao-or-extension))
		(as-contract (contract-call? proxy proxy-call payload))
	)
)
