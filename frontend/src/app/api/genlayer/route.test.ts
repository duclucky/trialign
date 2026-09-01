import {afterEach, describe, expect, it, vi} from "vitest";

import {GET, POST} from "./route";
import {NextRequest} from "next/server";

describe("GenLayer same-origin proxy health", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a bounded chain-id health result without exposing upstream data", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: "0xf22f",
      node_config: {private: true},
    }), {status: 200, headers: {"content-type": "application/json"}}));
    vi.stubGlobal("fetch", upstream);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ok: true, chainId: 61999});
    expect(upstream).toHaveBeenCalledWith(
      "https://studio.genlayer.com/api",
      expect.objectContaining({method: "POST", cache: "no-store"}),
    );
  });

  it("fails closed when Studionet returns an unexpected chain", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      result: "0x1",
    }), {status: 200})));

    const response = await GET();

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ok: false, error: "Studionet chain verification failed"});
  });

  it("allows the SDK transaction lookup method through the same-origin proxy", async () => {
    const upstream = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      jsonrpc: "2.0", id: 9, result: {status: "FINALIZED"},
    }), {status: 200, headers: {"content-type": "application/json"}}));
    vi.stubGlobal("fetch", upstream);
    const request = new NextRequest("http://localhost/api/genlayer", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 9,
        method: "eth_getTransactionByHash",
        params: ["0xabc"],
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(upstream).toHaveBeenCalledOnce();
  });
});
