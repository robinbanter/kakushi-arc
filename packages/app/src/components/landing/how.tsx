const layers = [
  ["Stealth hides who", "Every payment gets a fresh address. The public transaction does not name the recipient’s main wallet. Sender and amount remain visible; sharing keys or later transfers can reveal links."],
  ["Shielding breaks the link", "Deposit 1, 10 or 100 USDC, then prove ownership of a note without revealing which deposit you spent. Independent deposits build the anonymity set; timing can still reveal links."],
  ["A relayer pays withdrawal gas", "The recipient needs no gas to receive a shielded withdrawal. Your browser creates the proof; the relayer submits it and takes the quoted USDC fee from the note."],
];
export function How() {
  return <section className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6" aria-labelledby="how-title">
    <h2 id="how-title" className="serif text-4xl sm:text-5xl">Three layers. Use what you need.</h2>
    <div className="mt-8 divide-y divide-ui-hairline-strong">
      {layers.map(([title, body]) => <div key={title} className="grid gap-3 py-7 md:grid-cols-[1fr_2fr] md:gap-12">
        <h3 className="text-xl font-medium">{title}</h3><p className="max-w-[70ch] leading-relaxed text-ui-muted">{body}</p>
      </div>)}
    </div>
  </section>;
}
