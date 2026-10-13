import { NextResponse } from "next/server";
import { serverRpc } from "@/lib/server-config";

export const dynamic = "force-dynamic";

/** JSON-RPC proxy: the browser talks to one origin; an RPC key (ARC_RPC_URL) stays server-side. Only JSON-RPC bodies pass. */
export async function POST(req: Request) {
  const body = await req.text();
  if (body.length > 256 * 1024) return NextResponse.json({ error: "body too large" }, { status: 413 });
  try {
    const r = await fetch(serverRpc(), { method: "POST", headers: { "content-type": "application/json" }, body, cache: "no-store", signal: AbortSignal.timeout(10_000) });
    return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
  } catch (e) {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32603, message: `rpc unreachable: ${(e as Error).message}` } }, { status: 502 });
  }
}
