# Five-minute Arc mainnet film

Run `node scripts/e2e-browser-video-kakushi-5min.mjs` from this repository. The audit is read-only: successful receipts, exact gas fees and blocks, hosted landing page, and explorer logs. It does not recreate the paid flow.

Artifacts in the shared Arc workspace: `../video/out/kakushi-5min.mp4`, `../video/out/kakushi-5min.json`, `../video/out/kakushi-5min-script.json`, `../video/out/kakushi-5min-REVIEW.md`. Video binaries and raw recordings remain outside the repository.

Final render: 2026-10-14T18:58:24.619Z. Post-render RPC check: 13/13 successful, exact fees, at 2026-10-14T18:58:34.808Z.

- Positioning: a private execution layer for Arc, with the current courier artwork and integration view.
- Live: registration, 0.10 USDC stealth payment/scan/recovery, separate 1 USDC shielded deposit, browser proof, relayer withdrawal.
- Browser proof took 3.7 seconds; fresh recipient received 0.892499 USDC after 0.107501 USDC relayer fee. Recipient nonce was zero at withdrawal block.
- The 0.10 stealth payment is not presented as funding the separate 1 USDC shielded deposit. Secret note remains masked.
- All 13 original mainnet receipts retained, including funding/cleanup; no new broadcasts in this re-cut.
- Hosted Vercel app and serverless relayer handled the original flow. Fresh explorer overview/log recordings and contract pages added.
- Privacy scope: no direct everyday-recipient address in the stealth payment; pool-to-fresh-recipient withdrawal submitted by relayer.
- Weak: small anonymity set, public sender/amount, timing correlation, beta unaudited contracts. No claim of absolute unlinkability.

300 seconds, 1080p30, captions and instrumental bed. No voice or paid API calls in this job. Timed narration is reserved for a separate local Chatterbox pass.
