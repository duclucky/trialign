import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TrialignApp } from "./TrialignApp";


describe("TrialignApp", () => {
  it("uses the listing logo as an accessible decorative brand asset", () => {
    const {container} = render(<TrialignApp discover={async () => []} />);
    const logo = container.querySelector('img[src="/trialign-logo.svg"]');

    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute("alt", "");
    expect(logo).toHaveAttribute("width", "40");
    expect(logo).toHaveAttribute("height", "40");
  });

  it("shows a browser-local Studionet proxy verification", async () => {
    render(<TrialignApp
      discover={async () => []}
      probeRpc={async () => ({ok: true, chainId: 61999})}
    />);

    expect(await screen.findByText(/Studionet.*RPC verified/)).toBeVisible();
  });

  it("keeps writes disabled until the user explicitly chooses a wallet", async () => {
    const user = userEvent.setup();
    render(<TrialignApp discover={async () => [{
      id: "wallet-1",
      name: "Rabby",
      icon: "",
      provider: {request: vi.fn(async () => ["0x1111111111111111111111111111111111111111"])},
      selected: false,
    }]} />);
    expect(screen.getByRole("button", {name: /create case/i})).toBeDisabled();
    await user.click(screen.getByRole("button", {name: /connect wallet/i}));
    expect(await screen.findByRole("dialog", {name: /choose a wallet/i})).toBeVisible();
    expect(screen.getByRole("button", {name: "Rabby"})).toBeVisible();
  });

  it("opens an account menu and disconnect clears the account", async () => {
    const user = userEvent.setup();
    const request = vi.fn(async ({method}: {method: string}) => {
      if (method === "eth_requestAccounts") return ["0x1111111111111111111111111111111111111111"];
      return null;
    });
    render(<TrialignApp discover={async () => [{
      id: "wallet-1", name: "Rabby", icon: "", provider: {request}, selected: false,
    }]} />);
    await user.click(screen.getByRole("button", {name: /connect wallet/i}));
    await user.click(await screen.findByRole("button", {name: "Rabby"}));
    const account = await screen.findByRole("button", {name: /0x1111/i});
    await user.click(account);
    await user.click(screen.getByRole("button", {name: /disconnect/i}));
    expect(screen.getByRole("button", {name: /connect wallet/i})).toBeVisible();
    expect(screen.getByRole("button", {name: /create case/i})).toBeDisabled();
  });
});
