import { describe, expect, it, vi } from "vitest";

import { collectWallets, ensureStudionet } from "./wallets";


function provider(accounts: string[] = ["0x1111111111111111111111111111111111111111"]) {
  return {request: vi.fn(async ({method}: {method: string}) => {
    if (method === "eth_requestAccounts") return accounts;
    return null;
  })};
}


describe("wallet discovery", () => {
  it("collects EIP-6963 announcements and injected fallbacks without auto-selecting", async () => {
    const scope = new EventTarget() as EventTarget & Record<string, unknown>;
    const announced = provider();
    const injected = provider();
    scope.ethereum = injected;
    scope.addEventListener("eip6963:requestProvider", () => {
      scope.dispatchEvent(new CustomEvent("eip6963:announceProvider", {detail: {
        info: {uuid: "wallet-1", name: "Rabby", icon: "data:image/svg+xml,<svg/>", rdns: "io.rabby"},
        provider: announced,
      }}));
    });
    const wallets = await collectWallets(scope, 0);
    expect(wallets.map((item) => item.name)).toEqual(["Rabby", "Injected wallet"]);
    expect(wallets.every((item) => item.selected === false)).toBe(true);
  });

  it("deduplicates the same wallet brand across EIP-6963 wrappers and injected fallback", async () => {
    const scope = new EventTarget() as EventTarget & Record<string, unknown>;
    const announced = {...provider(), isMetaMask: true};
    const injected = {...provider(), isMetaMask: true};
    scope.ethereum = injected;
    scope.addEventListener("eip6963:requestProvider", () => {
      scope.dispatchEvent(new CustomEvent("eip6963:announceProvider", {detail: {
        info: {uuid: "metamask-a", name: "MetaMask", icon: "", rdns: "io.metamask"},
        provider: announced,
      }}));
      scope.dispatchEvent(new CustomEvent("eip6963:announceProvider", {detail: {
        info: {uuid: "metamask-b", name: "MetaMask", icon: "", rdns: "io.metamask"},
        provider: {...provider(), isMetaMask: true},
      }}));
    });

    const wallets = await collectWallets(scope, 0);

    expect(wallets.map((item) => item.name)).toEqual(["MetaMask"]);
  });

  it("labels a known OKX injected provider as OKX even when it also sets isMetaMask", async () => {
    const scope = new EventTarget() as EventTarget & Record<string, unknown>;
    const okx = {...provider(), isMetaMask: true};
    scope.ethereum = okx;
    scope.okxwallet = okx;

    const wallets = await collectWallets(scope, 0);

    expect(wallets.map((item) => item.name)).toEqual(["OKX Wallet"]);
  });

  it("switches first and adds Studionet only for an unknown-chain error", async () => {
    const calls: string[] = [];
    const wallet = {request: vi.fn(async ({method}: {method: string}) => {
      calls.push(method);
      if (method === "wallet_switchEthereumChain" && calls.length === 1) {
        throw Object.assign(new Error("unknown"), {code: 4902});
      }
      return null;
    })};
    await ensureStudionet(wallet);
    expect(calls).toEqual([
      "wallet_switchEthereumChain",
      "wallet_addEthereumChain",
      "wallet_switchEthereumChain",
    ]);
  });
});
