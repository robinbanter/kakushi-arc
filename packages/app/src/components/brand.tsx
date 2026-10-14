import Image from "next/image";
export function Brand() {
  return <span className="inline-flex items-center gap-2.5"><Image src="/brand/kakushi-logo.png" alt="" width={40} height={40} className="rounded-lg" /><span className="text-[21px] font-medium tracking-tight">Kakushi</span><span lang="ja" aria-label="hidden" className="ml-1 text-sm text-ui-muted">隠</span></span>;
}
