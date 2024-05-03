(define-public (redeem-mia-and-stack)
    (let (
            (amount (try! (contract-call? .ccd012-redemption-mia redeem-mia))))
        (contract-call? .lqstx-mint-endpoint-v1-02 request-mint amount))) 