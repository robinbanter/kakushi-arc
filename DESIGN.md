# Kakushi design system

Scope: Arc app landing, Developers, shared header and palette. The landing persuades; Developers explains; Pay, Receive and Shield remain task interfaces.

The brand is an unseen support corps: original masked couriers, a sealed violet envelope, ink-wash scenery and a small 隠 glyph. Use only the supplied original artwork. No borrowed characters, franchise names, crests or emblems.

- Ground: ink `#0B0F1A`; raised surfaces `#111728` and indigo `#1B2440`.
- Action: violet `#7C6CFF`, hover `#9588FF`, dark button text `#0B0F1A`; muted copy `#b2b8cf`.
- Typography: IBM Plex Serif for display headings, local Satoshi for body and controls, JetBrains Mono for code/data. Hero 46px mobile, fluid to 74px desktop; body 16–17px.
- Composition: full-width courier hero, 1200px content measure, three ordered steps, a real payment widget, compiled integration examples, editorial use-case rows and disclosure/comparison/limits sections.
- Mobile: hero artwork above the copy; steps and use cases become one column. Code scrolls within its own container. Shared header collapses navigation into the existing accessible menu.
- Header: brand, Pay, Receive, Shield, Developers, Connect. Wallet connection behavior is shared across routes.
- Art: `packages/app/public/brand/kakushi-{hero,mascot,logo}.png`. Hero has a legibility overlay; logo supplies favicon and social metadata. Pattern was not supplied, so no substitute pattern was invented.
- Voice: quiet, precise. Lead with the concrete action and identify whether it is Live (testnet), Fork or Not run. Stealth checkout and shielded withdrawals are separate tools.
- Claims: no rollup/TEE, no arbitrary confidential execution. Viewing-only SDK scans disclose incoming payments for a key; no per-payment export or compliance certification. Small anonymity sets, one relayer, unaudited; FHE next.

Verification: inspect 1440/390 screenshots after image decoding. Browser controls retain keyboard focus, wallet errors and loading states. Existing operational form geometry and effects were preserved; they are not a template for new marketing sections.
