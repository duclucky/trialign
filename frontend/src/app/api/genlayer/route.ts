import {NextRequest, NextResponse} from "next/server";

const TARGET = "https://studio.genlayer.com/api";
const ALLOWED_METHODS = new Set([
  "eth_chainId",
  "eth_getTransactionByHash",
  "gen_call",
  "gen_getContractSchema",
  "gen_get_contract_schema",
  "gen_getTransactionReceipt",
  "gen_get_transaction_receipt",
  "gen_getTransactionStatus",
  "gen_get_transaction_status",
]);

export async function GET() {
  try {
    const response = await fetch(TARGET, {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "eth_chainId", params: []}),
      cache: "no-store",
    });
    const payload = await response.json() as {result?: unknown};
    const chainId = typeof payload.result === "string"
      ? Number.parseInt(payload.result, 16)
      : Number(payload.result);
    if (!response.ok || chainId !== 61999) throw new Error("unexpected chain");
    return NextResponse.json({ok: true, chainId});
  } catch {
    return NextResponse.json(
      {ok: false, error: "Studionet chain verification failed"},
      {status: 502},
    );
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {jsonrpc?: string; id?: unknown; method?: string};
  if (body.jsonrpc !== "2.0" || !body.method || !ALLOWED_METHODS.has(body.method)) {
    return NextResponse.json({jsonrpc: "2.0", id: body.id ?? null, error: {code: -32601, message: "Method not allowed"}}, {status: 400});
  }
  const response = await fetch(TARGET, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return new NextResponse(await response.text(), {
    status: response.status,
    headers: {"content-type": response.headers.get("content-type") || "application/json"},
  });
}
