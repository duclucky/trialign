"use client";

import {useEffect, useState} from "react";
import Image from "next/image";
import {CheckCircle2, ExternalLink, LogOut, RefreshCw, Search, ShieldCheck, Wallet} from "lucide-react";

import {configuredContractAddress, FinalityUnverifiedError, FinalizedExecutionError, readCase, transactionExplorerUrl, writeAndFinalize, type Address, type CanonicalCase} from "../lib/contract";
import {normalizeLifecycle, type Lifecycle} from "../lib/lifecycle";
import {collectWallets, ensureStudionet, type WalletOption} from "../lib/wallets";

type Discover = () => Promise<WalletOption[]>;
type ProbeRpc = () => Promise<{ok: boolean; chainId: number}>;

async function defaultProbeRpc() {
  const response = await fetch("/api/genlayer", {cache: "no-store"});
  if (!response.ok) throw new Error("Studionet RPC unavailable");
  return await response.json() as {ok: boolean; chainId: number};
}

const lifecycleLabels: Record<Lifecycle, string> = {
  idle: "Ready",
  submitted: "Submitted",
  accepted: "Accepted — awaiting finality",
  finalized: "Finalized — canonical state reloaded",
  failed: "Finalized with failure",
  retry: "Retry available",
};

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function TrialignApp({discover, probeRpc}: {discover?: Discover; probeRpc?: ProbeRpc}) {
  const discoverWallets = discover ?? (() => collectWallets(window as unknown as Window & Record<string, unknown>));
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);
  const [account, setAccount] = useState<Address | null>(null);
  const [caseId, setCaseId] = useState("");
  const [nctId, setNctId] = useState("");
  const [pmid, setPmid] = useState("");
  const [canonical, setCanonical] = useState<CanonicalCase | null>(null);
  const [lifecycle, setLifecycle] = useState<Lifecycle>("idle");
  const [txHash, setTxHash] = useState("");
  const [message, setMessage] = useState("");
  const [rpcStatus, setRpcStatus] = useState<"checking" | "verified" | "failed">("checking");

  useEffect(() => {
    let active = true;
    (probeRpc ?? defaultProbeRpc)()
      .then((result) => {
        if (active) setRpcStatus(result.ok && result.chainId === 61999 ? "verified" : "failed");
      })
      .catch(() => {
        if (active) setRpcStatus("failed");
      });
    return () => { active = false; };
  }, [probeRpc]);

  async function openChooser() {
    setMessage("");
    const found = await discoverWallets();
    setWallets(found);
    setChooserOpen(true);
  }

  async function connect(wallet: WalletOption) {
    try {
      const result = await wallet.provider.request({method: "eth_requestAccounts"}) as string[];
      if (!result?.[0]) throw new Error("The wallet returned no account.");
      await ensureStudionet(wallet.provider);
      setSelectedWallet(wallet);
      setAccount(result[0] as Address);
      setChooserOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Wallet connection failed.");
    }
  }

  function disconnect() {
    setSelectedWallet(null);
    setAccount(null);
    setAccountOpen(false);
    setLifecycle("idle");
    setTxHash("");
  }

  async function refresh() {
    if (!caseId) return;
    try {
      setCanonical(await readCase(caseId));
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Canonical read failed.");
    }
  }

  async function transact(
    method: "create_case" | "attach_publication" | "adjudicate" | "cancel_unattached",
    args: string[],
  ) {
    if (!selectedWallet || !account) return;
    try {
      setLifecycle("submitted");
      setMessage("");
      const result = await writeAndFinalize(
        method,
        args,
        selectedWallet.provider,
        account,
        () => setLifecycle("accepted"),
      );
      setTxHash(result.hash);
      setCanonical(result.canonical);
      const normalized = normalizeLifecycle(result.finalReceipt);
      setLifecycle(normalized === "idle" ? "finalized" : normalized);
    } catch (error) {
      setLifecycle(error instanceof FinalizedExecutionError ? "failed" : "retry");
      if (error instanceof FinalizedExecutionError || error instanceof FinalityUnverifiedError) {
        setTxHash(error.transactionHash);
      }
      setMessage(error instanceof Error ? error.message : "Transaction failed.");
    }
  }

  const writesDisabled = !account || lifecycle === "submitted" || lifecycle === "accepted";
  const address = configuredContractAddress();

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#main" aria-label="Trialign home">
        <Image className="brand-mark" src="/trialign-logo.svg" alt="" width={40} height={40} priority/>
        <span><strong>Trialign</strong><small>Outcome concordance</small></span>
      </a>
      <div className={`network-chip ${rpcStatus}`}><span/> Studionet · 61999 · {rpcStatus === "verified" ? "RPC verified" : rpcStatus === "failed" ? "RPC unavailable" : "RPC checking"}</div>
      {account ? <div className="account-wrap">
        <button className="account-button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}>
          <Wallet size={16}/> {shortAddress(account)}
        </button>
        {accountOpen && <div className="account-menu">
          <div><small>Connected with</small><strong>{selectedWallet?.name}</strong></div>
          <button onClick={disconnect}><LogOut size={16}/> Disconnect</button>
        </div>}
      </div> : <button className="button primary" onClick={openChooser}><Wallet size={17}/> Connect wallet</button>}
    </header>

    <main id="main">
      <section className="hero">
        <div>
          <p className="eyebrow">Prospective evidence · validator consensus · canonical gate</p>
          <h1>Did the publication report what the trial registered?</h1>
          <p className="lede">Lock a public ClinicalTrials.gov primary-outcome baseline before completion, then compare one linked PubMed record without turning uncertainty into an accusation.</p>
        </div>
        <aside className="boundary-card">
          <ShieldCheck size={22}/>
          <div><strong>Honest boundary</strong><p>Reporting concordance only. Not misconduct, clinical validity, legal compliance, or journal acceptance.</p></div>
        </aside>
      </section>

      <section className="status-strip" aria-live="polite">
        <div><small>Transaction</small><strong className={`status ${lifecycle}`}>{lifecycleLabels[lifecycle]}</strong></div>
        <div><small>Contract</small><strong>{address ? shortAddress(address) : "Not configured"}</strong></div>
        <div><small>Canonical gate</small><strong>{canonical?.can_advance_reporting ? "Open" : "Closed"}</strong></div>
        {txHash && <a href={transactionExplorerUrl(txHash)} target="_blank" rel="noreferrer">View transaction <ExternalLink size={14}/></a>}
      </section>

      {message && <div className="notice" role="alert">{message}</div>}

      <section className="workspace" aria-label="Trialign workflow">
        <article className="panel workflow-panel">
          <div className="panel-heading"><div><p className="eyebrow">Wallet-signed lifecycle</p><h2>Case workflow</h2></div><span>4 writes</span></div>
          <div className="field-grid">
            <label>Case ID<input value={caseId} onChange={(event) => setCaseId(event.target.value)} placeholder="study-alpha"/></label>
            <label>NCT ID<input value={nctId} onChange={(event) => setNctId(event.target.value)} placeholder="NCT01234567"/></label>
            <label>PMID<input value={pmid} onChange={(event) => setPmid(event.target.value)} placeholder="12345678" inputMode="numeric"/></label>
          </div>
          <div className="action-grid">
            <button disabled={writesDisabled || !caseId || !nctId} onClick={() => transact("create_case", [caseId, nctId])}><span>01</span><strong>Create case</strong><small>Fetch and lock the registered baseline.</small></button>
            <button disabled={writesDisabled || !caseId || !pmid} onClick={() => transact("attach_publication", [caseId, pmid])}><span>02</span><strong>Attach publication</strong><small>Bind one PMID; no caller summary.</small></button>
            <button disabled={writesDisabled || !caseId} onClick={() => transact("adjudicate", [caseId])}><span>03</span><strong>Adjudicate</strong><small>Validators retrieve and compare.</small></button>
            <button className="quiet" disabled={writesDisabled || !caseId} onClick={() => transact("cancel_unattached", [caseId])}><span>04</span><strong>Cancel unattached</strong><small>Requester-only recovery before PMID.</small></button>
          </div>
        </article>

        <aside className="panel canonical-panel">
          <div className="panel-heading"><div><p className="eyebrow">Finalized state</p><h2>Canonical case</h2></div><button className="icon-button" onClick={refresh} disabled={!caseId} aria-label="Reload canonical case"><RefreshCw size={17}/></button></div>
          {!canonical ? <div className="empty-state"><Search size={28}/><p>Enter a case ID and reload finalized onchain state.</p></div> : <dl>
            <div><dt>State</dt><dd>{canonical.state}</dd></div>
            <div><dt>NCT</dt><dd>{canonical.nct_id || "—"}</dd></div>
            <div><dt>PMID</dt><dd>{canonical.pmid || "—"}</dd></div>
            <div><dt>Baseline digest</dt><dd className="mono">{canonical.baseline_digest ? shortAddress(canonical.baseline_digest) : "—"}</dd></div>
            <div><dt>Publication digest</dt><dd className="mono">{canonical.publication_digest ? shortAddress(canonical.publication_digest) : "—"}</dd></div>
            <div className="gate-row"><dt>Reporting complete</dt><dd>{canonical.can_advance_reporting ? <><CheckCircle2 size={16}/> Yes</> : "No"}</dd></div>
          </dl>}
          <p className="state-note">Accepted is visible but never treated as final. This panel reloads only canonical contract state after finalization.</p>
        </aside>
      </section>
    </main>

    {chooserOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setChooserOpen(false)}>
      <section className="wallet-modal" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
        <p className="eyebrow">Detected in this browser</p>
        <h2 id="wallet-title">Choose a wallet</h2>
        <p>Trialign will not select a provider for you.</p>
        <div className="wallet-list">
          {wallets.length ? wallets.map((wallet) => <button key={wallet.id} aria-label={wallet.name} onClick={() => connect(wallet)}>
            {wallet.icon ? <img src={wallet.icon} alt=""/> : <span className="wallet-fallback"><Wallet size={18}/></span>}
            <strong>{wallet.name}</strong><span>Connect</span>
          </button>) : <div className="empty-wallet">No compatible EVM wallet was detected.</div>}
        </div>
        <button className="button secondary" onClick={() => setChooserOpen(false)}>Close</button>
      </section>
    </div>}
  </div>;
}
