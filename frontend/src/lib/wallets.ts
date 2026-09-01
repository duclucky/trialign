export interface Eip1193Provider {
  request(args: {method: string; params?: unknown[] | Record<string, unknown>}): Promise<unknown>;
  isMetaMask?: boolean;
  isRabby?: boolean;
  isCoinbaseWallet?: boolean;
  isBraveWallet?: boolean;
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
  providers?: Eip1193Provider[];
}

export interface WalletOption {
  id: string;
  name: string;
  icon: string;
  provider: Eip1193Provider;
  selected: false;
}

interface Eip6963Detail {
  info: {uuid: string; name: string; icon: string; rdns: string};
  provider: Eip1193Provider;
}

type WalletScope = EventTarget & Record<string, unknown>;

const CHAIN_ID = "0xf22f";
const RPC_URL = "https://studio.genlayer.com/api";

function fallbackName(provider: Eip1193Provider): string {
  if (provider.isRabby) return "Rabby";
  if (provider.isCoinbaseWallet) return "Coinbase Wallet";
  if (provider.isBraveWallet) return "Brave Wallet";
  if (provider.isOkxWallet || provider.isOKExWallet) return "OKX Wallet";
  if (provider.isMetaMask) return "MetaMask";
  return "Injected wallet";
}

export async function collectWallets(
  scope: WalletScope,
  waitMs = 80,
): Promise<WalletOption[]> {
  const options: WalletOption[] = [];
  const seenProviders = new Set<Eip1193Provider>();
  const seenBrands = new Set<string>();
  const add = (item: Omit<WalletOption, "selected">) => {
    const brand = item.name.trim().toLowerCase();
    const hasStableBrand = brand !== "injected wallet";
    if (seenProviders.has(item.provider) || (hasStableBrand && seenBrands.has(brand))) return;
    seenProviders.add(item.provider);
    if (hasStableBrand) seenBrands.add(brand);
    options.push({...item, selected: false});
  };
  const announce = (event: Event) => {
    const detail = (event as CustomEvent<Eip6963Detail>).detail;
    if (!detail?.provider || !detail.info?.uuid) return;
    add({
      id: detail.info.uuid,
      name: detail.info.name,
      icon: detail.info.icon,
      provider: detail.provider,
    });
  };
  scope.addEventListener("eip6963:announceProvider", announce);
  scope.dispatchEvent(new Event("eip6963:requestProvider"));
  await new Promise((resolve) => setTimeout(resolve, waitMs));
  scope.removeEventListener("eip6963:announceProvider", announce);

  const injected = scope.ethereum as Eip1193Provider | undefined;
  const okx = scope.okxwallet as Eip1193Provider | undefined;
  const rabby = scope.rabby as Eip1193Provider | undefined;
  const coinbase = scope.coinbaseWalletExtension as Eip1193Provider | undefined;
  const nameFor = (provider: Eip1193Provider) => {
    if (provider === okx) return "OKX Wallet";
    if (provider === rabby) return "Rabby";
    if (provider === coinbase) return "Coinbase Wallet";
    return fallbackName(provider);
  };
  const candidates = [
    ...(injected?.providers ?? []),
    injected,
    okx,
    rabby,
    coinbase,
  ];
  for (const provider of candidates) {
    if (!provider?.request) continue;
    add({
      id: `injected-${options.length + 1}`,
      name: nameFor(provider),
      icon: "",
      provider,
    });
  }
  return options;
}

export async function requestWalletAccounts(provider: Eip1193Provider): Promise<string[]> {
  const authorized = await provider.request({method: "eth_accounts"}) as string[];
  if (authorized?.[0]) return authorized;
  return await provider.request({method: "eth_requestAccounts"}) as string[];
}

export async function ensureStudionet(provider: Eip1193Provider): Promise<void> {
  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{chainId: CHAIN_ID}],
    });
  } catch (error) {
    if ((error as {code?: number}).code !== 4902) throw error;
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [{
        chainId: CHAIN_ID,
        chainName: "GenLayer Studionet",
        nativeCurrency: {name: "GEN", symbol: "GEN", decimals: 18},
        rpcUrls: [RPC_URL],
        blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
      }],
    });
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{chainId: CHAIN_ID}],
    });
  }
}
