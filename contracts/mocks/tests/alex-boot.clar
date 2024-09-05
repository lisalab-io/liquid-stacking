;; SPDX-License-Identifier: BUSL-1.1

(impl-trait 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.proposal-trait.proposal-trait)

(define-constant ONE_8 u100000000)

(define-public (execute (sender principal))
	(begin		 
        (try! (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.executor-dao set-extensions (list
			{ extension: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.alex-staking-v2, enabled: true }
            { extension: 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.migrate-legacy-v2-wl, enabled: true }
		)))      

        (try! (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.migrate-legacy-v2-wl whitelist (list .auto-alex-v3) (list true)))

        (try! (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex mint ONE_8 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG))
        (try! (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex mint ONE_8 'ST2JHG361ZXG51QTKY2NQCVBPPRRE2KZB1HR05NNC))
        (try! (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex mint ONE_8 'ST2NEB84ASENDXKYGJPQW86YXQCEFEX2ZQPG87ND))
        (try! (contract-call? 'SP102V8P0F7JX67ARQ77WEA3D3CFB5XW39REDT0AM.token-alex mint ONE_8 'ST2REHHS5J3CERCRBEPMGH7921Q6PYKAADT7JP2VB))        
        
        (ok true)))