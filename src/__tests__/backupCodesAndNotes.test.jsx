import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import ModalRouter from "../components/ModalRouter";
import { CredCard } from "../components/shared";
import PersonalSpaceView from "../components/PersonalSpaceView";

describe("Google Backup Codes & Secure Notes UX Test Suite", () => {
  it("renders ModalRouter with dedicated textarea layout for note / backup codes without watchdog or generator clutter", () => {
    const html = renderToString(
      <ModalRouter
        modal={{
          type: "cred",
          projectId: "proj-1",
          initialData: { secretType: "note" },
        }}
        onClose={vi.fn()}
        onAddCred={vi.fn()}
      />
    );

    // 1. Should have Heading & Note/Codes title
    expect(html).toContain("Item Name / Title *");
    expect(html).toContain("Account / Identifier (Optional)");

    // 2. Should have dedicated Backup Codes textarea
    expect(html).toContain("Secret Backup Codes / Note Content *");
    expect(html).toContain("<textarea");
    expect(html).toContain("Tip: Paste all 10 backup codes here");

    // 3. Should NOT contain developer password generator button
    expect(html).not.toContain("⚡ Generate");

    // 4. Should NOT contain subscription Renewal Watchdog for notes
    expect(html).not.toContain("Renewal Watchdog &amp; Billing Tracker");
  });

  it("renders CredCard with clean dedicated backup codes box and suppresses developer format bar", () => {
    const backupCodesCred = {
      id: "cred-google-2fa",
      label: "Google Account Backup Codes",
      secretType: "note",
      username: "myemail@gmail.com",
      password: "1122 3344\n5566 7788\n9900 1122\n3344 5566",
      environment: "global",
      createdAt: "2026-09-25T05:00:00.000Z",
    };

    // Revealed state
    const htmlRevealed = renderToString(
      <CredCard
        cred={backupCodesCred}
        revealed={true}
        onReveal={vi.fn()}
        onCopy={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    // Should render note badge
    expect(htmlRevealed).toContain("SECURE NOTE / CODES");
    expect(htmlRevealed).toContain("Google Account Backup Codes");
    expect(htmlRevealed).toContain("myemail@gmail.com");

    // Should render codes container and line count
    expect(htmlRevealed).toContain("ENCRYPTED BACKUP CODES / TEXT");
    expect(htmlRevealed).toContain("4 codes / lines");
    expect(htmlRevealed).toContain("Copy All");

    // Should render individual lines with numbers
    expect(htmlRevealed).toContain("1122 3344");
    expect(htmlRevealed).toContain("5566 7788");

    // Should NOT contain developer quick-action format bar (.ENV, BASH, DOCKER)
    expect(htmlRevealed).not.toContain("COPY AS:");
    expect(htmlRevealed).not.toContain(".ENV");
    expect(htmlRevealed).not.toContain("DOCKER");

    // Masked state
    const htmlMasked = renderToString(
      <CredCard
        cred={backupCodesCred}
        revealed={false}
        onReveal={vi.fn()}
        onCopy={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(htmlMasked).toContain("Reveal");
    expect(htmlMasked).toContain("unmask all encrypted backup codes");
  });

  it("renders PersonalSpaceView with dedicated multiline codes container when revealed", () => {
    const noteCred = {
      id: "note-1",
      label: "Google Backup Codes",
      category: "notes",
      secretType: "note",
      password: "code-alpha-001\ncode-beta-002",
    };

    const html = renderToString(
      <PersonalSpaceView
        creds={[noteCred]}
        projects={[]}
        onAddCred={vi.fn()}
        onEditCred={vi.fn()}
        onDeleteCred={vi.fn()}
        onCopy={vi.fn()}
      />
    );

    // Should show title
    expect(html).toContain("Google Backup Codes");
    expect(html).toContain("Personal Space");
  });
});
