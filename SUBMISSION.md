# Kakushi — the privacy layer for Arc

## Description

Drop private USDC payments into any app. Kakushi gives Arc developers a source SDK and `<KakushiPay>` React widget: resolve a recipient, approve USDC and send to a fresh ERC-5564 stealth address. Recipients register through ERC-6538 and scan their payments. For unlinking deposits and withdrawals, fixed-size USDC pools use Noir/UltraHonk proofs generated in the browser. A relayer submits withdrawals and takes its quoted USDC fee from the note, so the recipient needs no gas.

Live on Arc testnet: registration, widget payment, receive scan, shield and browser-proved relayer withdrawal. The landing page lets you try a real 0.01 USDC payment; Developers contains typechecked examples and contract links. Source packages are not on npm yet. Small anonymity sets, one relayer and unaudited software remain explicit limits. Sender and amount stay public; hidden amounts through FHE are next, not shipped. Mainnet is not deployed.

## What it uses Arc for

- USDC is the payment asset, pool asset, relayer fee and gas token.
- The 6-decimal ERC-20 interface and 18-decimal native gas accounting are handled separately.
- Deterministic finality supports prompt receipt confirmation.
- Arc Foundry tests cover FiatToken behavior and local forks; live evidence uses the public testnet.

## Demo

1. Run the app and relayer as documented in README / docs/JUDGE-WALKTHROUGH.md.
2. Connect on Receive, unlock and register your private receiving address.
3. Return to the landing page. Pay 0.01 USDC through the actual widget; scan Receive.
4. Shield 1 USDC after saving the note. Withdraw with an in-browser proof to a fresh address through the relayer.
5. Open Developers for the source integration and testnet explorer links.

Evidence: [live testnet transactions](docs/E2E-TESTNET.md), [browser rehearsal](docs/BROWSER-TESTNET.json), [screenshots](docs/screens/testnet/). No hosted instance is claimed.
