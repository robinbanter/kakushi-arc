# Mainnet video evidence — 2026-10-14

Run `node scripts/e2e-browser-video-kakushi.mjs` for a read-only browser and RPC verification. No keys, funding or broadcasts are needed.

The recording used the hosted Vercel app throughout. Alice sent 0.1 USDC to Bob's one-time stealth address; Bob's viewing-key scan found it and his derived spending key moved the funds back. A separate 1-USDC deposit was withdrawn using a real Noir/UltraHonk proof generated in the browser (the UI measured 3.7 seconds). The hosted serverless relayer submitted the successful mainnet withdrawal.

The recipient received 0.892499 USDC, having zero balance before the withdrawal and nonce zero at its block. The relayer charged 0.107501 USDC and paid 0.072847324 USDC gas. The private note field was visually masked during capture. It was never replaced with a fake note or proof.

All 13 recording/funding/recovery receipts are in VIDEO-RECEIPTS.json. Total gas was 0.095648707 USDC. Demo wallets were swept; the relayer's starting float was preserved, with its surplus returned. The stealth address retains 0.000441914 USDC gas dust. Small wallet dust remains controlled.

A mainnet blocker was corrected: the serverless relay had an unconditional testnet-only guard. It now validates the selected Arc chain against its deployment and reports the corresponding chain ID. Tests cover both networks and a deployment mismatch. The updated production alias is https://kakushi-arc.vercel.app.

Privacy limits remain explicit: small anonymity set, public sender/amount for stealth payments, possible timing correlation and unaudited beta software. Split screens combine separately recorded real personas; they do not assert simultaneous action. Fresh-recipient historical nonce checks precede the later cleanup sweep.
