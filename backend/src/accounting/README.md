# accounting/ — posting engine (built in P2)

`PostingService.post(em, voucher)` is the ONLY way journals are written. It asserts Σ Dr = Σ Cr, FY open, then saves
voucher + lines in the caller's transaction. Posting rules per event live here (`rules/*.ts`).
Matrix: `.brain/ACCOUNTING_RULES.md`. Tests are mandatory.
