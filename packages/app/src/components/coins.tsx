/** Coins: Arc and USDC marks, drawn inline (no third-party chain logos). */

export function UsdcCoin({ size = 42 }: { size?: number }) {
  return (
    <span role="img" aria-label="USDC" className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-black/10" style={{ width: size, height: size }}>
      {/* Tiny local SVG; no image transformation needed. */}
      <img src="/logos/usdc.svg" alt="" width={size} height={size} style={{ width: "100%", height: "100%" }} draggable={false} />
    </span>
  );
}

/** A neutral Arc chip: a bent arc in the app's blue. */
export function ArcCoin({ size = 42 }: { size?: number }) {
  return (
    <span role="img" aria-label="Arc" className="inline-grid shrink-0 place-items-center rounded-full bg-[#16205a] ring-1 ring-[#3b55ff]/50" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.58} height={size * 0.58} fill="none" stroke="#c4d0ff" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
        <path d="M4 17a8 8 0 0 1 16 0" />
        <circle cx="12" cy="17" r="1.2" fill="#c4d0ff" stroke="none" />
      </svg>
    </span>
  );
}
