import { NextResponse } from "next/server";
import { localRelay } from "@/lib/hosted-relayer";
import { relayerBase } from "@/lib/server-config";

export const maxDuration = 60;
export const runtime = "nodejs";

export const dynamic = "force-dynamic";

/** Same-origin proxy to the relayer (GET /info, POST /relay), so the browser needs no CORS and no relayer URL. */
async function forward(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const route = path.join("/");
  if (route !== "info" && route !== "relay" && route !== "health") return NextResponse.json({ error: "not found" }, { status: 404 });
  if (process.env.RELAYER_KEY) return localRelay(req, route);
  const base = relayerBase();
  if (!base) return NextResponse.json({ error: "the relayer is not configured for this deployment" }, { status: 503 });
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/${route}`, {
      method: req.method,
      headers: { "content-type": "application/json" },
      body: req.method === "GET" ? undefined : await req.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(60_000),
    });
    return new NextResponse(await r.text(), { status: r.status, headers: { "content-type": "application/json" } });
  } catch (e) {
    return NextResponse.json({ error: `relayer unreachable: ${(e as Error).message}` }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
