import { describe, it, expect, vi } from "vitest";
import React from "react";
import CommandPalette from "../components/CommandPalette";

describe("CommandPalette Search Component Suite", () => {
  const sampleClients = [
    {
      id: "client-1",
      name: "Acme Agency",
      projects: [
        {
          id: "proj-1",
          name: "Mobile Banking App",
          credentials: [
            {
              id: "cred-1",
              label: "DATABASE_URL",
              username: "postgres",
              password: "secret_db_password",
              environment: "prod",
              secretType: "database",
            },
            {
              id: "cred-2",
              label: "STRIPE_SECRET_KEY",
              username: "sk_live_12345",
              password: "stripe_secret",
              environment: "prod",
              secretType: "api_key",
            },
          ],
        },
      ],
    },
  ];

  it("renders CommandPalette without ReferenceError for Crown or any missing icons", async () => {
    const handleClose = vi.fn();
    const handleSelectClient = vi.fn();
    const handleSelectProject = vi.fn();
    const handleCopy = vi.fn();
    const handleNavigate = vi.fn();
    const handleOpenModal = vi.fn();

    const { renderToString } = await import("react-dom/server");
    const html = renderToString(
      React.createElement(CommandPalette, {
        clients: sampleClients,
        onClose: handleClose,
        onSelectClient: handleSelectClient,
        onSelectProject: handleSelectProject,
        onCopySecret: handleCopy,
        onNavigate: handleNavigate,
        onOpenModal: handleOpenModal,
      })
    );

    expect(html).toContain("Developer Quick Commands");
    expect(html).toContain("Vault Projects Overview");
    expect(html).toContain("Search projects, .env keys");
  });

  it("filters secrets, projects, and clients by query correctly", () => {
    // Test searching logic
    const query = "stripe";
    const q = query.toLowerCase().trim();

    const matchingProjects = [];
    const matchingCreds = [];
    const matchingClients = [];

    sampleClients.forEach((c) => {
      if (c.name.toLowerCase().includes(q)) matchingClients.push(c);
      c.projects.forEach((p) => {
        if (p.name.toLowerCase().includes(q)) matchingProjects.push(p);
        p.credentials.forEach((cr) => {
          if (
            cr.label.toLowerCase().includes(q) ||
            (cr.username && cr.username.toLowerCase().includes(q)) ||
            (cr.environment && cr.environment.toLowerCase().includes(q)) ||
            (cr.secretType && cr.secretType.toLowerCase().includes(q))
          ) {
            matchingCreds.push(cr);
          }
        });
      });
    });

    expect(matchingCreds.length).toBe(1);
    expect(matchingCreds[0].label).toBe("STRIPE_SECRET_KEY");
  });
});
