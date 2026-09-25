import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";

import AuthScreen from "../AuthScreen";
import VaultUnlock from "../VaultUnlock";
import ResetPasswordScreen from "../ResetPasswordScreen";
import PasswordGenerator from "../components/PasswordGenerator";
import CommandPalette from "../components/CommandPalette";
import PersonalSpaceView from "../components/PersonalSpaceView";
import AboutProjectView from "../components/AboutProjectView";
import DeploymentCenter from "../components/DeploymentCenter";
import EnvironmentStudio from "../components/EnvironmentStudio";
import FloatingStickyNotes from "../components/FloatingStickyNotes";
import OwnerCommandCenter from "../components/OwnerCommandCenter";
import ProfilePanel from "../components/ProfilePanel";
import SharedSecretsView from "../components/SharedSecretsView";
import TrashView from "../components/TrashView";
import WatchdogView from "../components/WatchdogView";
import OnboardingTour from "../components/OnboardingTour";
import ModalRouter from "../components/ModalRouter";
import WelcomeScreen from "../components/WelcomeScreen";
import LandingPage from "../components/LandingPage";
import AdminSupportPanel from "../components/AdminSupportPanel";


// Mock localStorage and sessionStorage for Node.js test environment
const memoryStore = {};
const mockStorage = {
  getItem: (k) => memoryStore[k] || null,
  setItem: (k, v) => { memoryStore[k] = String(v); },
  removeItem: (k) => { delete memoryStore[k]; },
  clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
};
global.localStorage = mockStorage;
global.sessionStorage = mockStorage;

describe("All Components Smoke & Render Integrity Suite", () => {
  const mockProject = {
    id: "proj-1",
    name: "Fintech Platform",
    clientName: "Alpha Capital",
    credentials: [
      { id: "c-1", label: "STRIPE_KEY", username: "sk_live", password: "123", environment: "prod" }
    ],
    details: {
      notes: "Production deployment specs",
      checklist: [{ id: 1, text: "Deploy API", completed: false }],
      deploy: { runbook: "Run terraform apply" }
    }
  };

  const mockClient = {
    id: "client-1",
    name: "Alpha Capital",
    projects: [mockProject]
  };

  it("renders AuthScreen without crashing", () => {
    const html = renderToString(<AuthScreen onAuthed={vi.fn()} />);
    expect(html).toContain("CUSTODIAN");
    expect(html).toContain("Log in");
  });

  it("renders VaultUnlock without crashing", () => {
    const html = renderToString(
      <VaultUnlock
        userId="user-1"
        userEmail="test@custodian.app"
        onUnlocked={vi.fn()}
        onSignOut={vi.fn()}
      />
    );
    expect(html).toContain("Unlock Secure Vault");
  });

  it("renders ResetPasswordScreen without crashing", () => {
    const html = renderToString(
      <ResetPasswordScreen
        session={{ user: { email: "test@custodian.app" } }}
        onDone={vi.fn()}
      />
    );
    expect(html).toContain("Set New Password");
  });

  it("renders PasswordGenerator without crashing", () => {
    const html = renderToString(<PasswordGenerator />);
    expect(html).toContain("Generate");
  });

  it("renders CommandPalette without crashing", () => {
    const html = renderToString(
      <CommandPalette
        clients={[mockClient]}
        onClose={vi.fn()}
        onSelectClient={vi.fn()}
        onSelectProject={vi.fn()}
        onCopySecret={vi.fn()}
        onNavigate={vi.fn()}
        onOpenModal={vi.fn()}
      />
    );
    expect(html).toContain("Developer Quick Commands");
  });

  it("renders PersonalSpaceView without crashing", () => {
    const html = renderToString(
      <PersonalSpaceView
        personalClient={mockClient}
        personalProject={mockProject}
        creds={mockProject.credentials}
        onAddCred={vi.fn()}
        onEditCred={vi.fn()}
        onDeleteCred={vi.fn()}
        onCopy={vi.fn()}
        copiedId={null}
      />
    );
    expect(html).toContain("Personal");
  });

  it("renders AboutProjectView without crashing", () => {
    const html = renderToString(
      <AboutProjectView
        project={mockProject}
        activeTab="timeline"
        onUpdateDetails={vi.fn()}
        onOpenEdit={vi.fn()}
      />
    );
    expect(html).toContain("Delivery Timeline");
  });

  it("renders DeploymentCenter without crashing", () => {
    const html = renderToString(
      <DeploymentCenter
        project={mockProject}
        client={mockClient}
        onOpenModal={vi.fn()}
      />
    );
    expect(html).toContain("Deployment");
  });

  it("renders EnvironmentStudio without crashing", () => {
    const html = renderToString(
      <EnvironmentStudio
        project={mockProject}
        onAddSecret={vi.fn()}
        onEditSecret={vi.fn()}
        onDeleteSecret={vi.fn()}
        onImportEnv={vi.fn()}
        onExportEnv={vi.fn()}
      />
    );
    expect(html).toContain("Environment");
  });

  it("renders FloatingStickyNotes without crashing", () => {
    const html = renderToString(
      <FloatingStickyNotes
        isOpen={true}
        currentPlan="pro"
        onOpenUpgrade={vi.fn()}
        onClose={vi.fn()}
        activeProject={mockProject}
        onAppendToProject={vi.fn()}
      />
    );
    expect(html).toContain("Sticky");
  });

  it("renders OwnerCommandCenter without crashing", () => {
    const html = renderToString(
      <OwnerCommandCenter
        clients={[mockClient]}
        onSelectProject={vi.fn()}
        onOpenModal={vi.fn()}
      />
    );
    expect(html).toBeDefined();
  });

  it("renders ProfilePanel without crashing", () => {
    const html = renderToString(
      <ProfilePanel
        userId="user-1"
        profile={{ id: "user-1", email: "test@custodian.app", plan: "pro", role: "member" }}
        onClose={vi.fn()}
        onProfileUpdate={vi.fn()}
        onLock={vi.fn()}
      />
    );
    expect(html).toContain("Profile");
  });

  it("renders SharedSecretsView without crashing", () => {
    const html = renderToString(
      <SharedSecretsView
        userId="user-1"
        userEmail="test@custodian.app"
        ecdhPrivateKey={null}
        onOpenShareModal={vi.fn()}
        showSuccess={vi.fn()}
      />
    );
    expect(html).toContain("Shared");
  });

  it("renders TrashView without crashing", () => {
    const html = renderToString(
      <TrashView
        trashedItems={{ clients: [], projects: [], credentials: [] }}
        onRestore={vi.fn()}
        onPermanentDelete={vi.fn()}
        onEmptyTrash={vi.fn()}
      />
    );
    expect(html).toContain("Trash");
  });

  it("renders WatchdogView without crashing", () => {
    const html = renderToString(
      <WatchdogView
        clients={[mockClient]}
        onOpenEditCred={vi.fn()}
        onSelectProject={vi.fn()}
        userId="user-1"
        userEmail="test@custodian.app"
        currentPlan="pro"
      />
    );
    expect(html).toContain("WATCHDOG");
  });

  it("renders OnboardingTour without crashing", () => {
    const html = renderToString(<OnboardingTour onComplete={vi.fn()} />);
    expect(html).toContain("Welcome");
  });

  it("renders ModalRouter for generator, upgrade, and readiness_audit without crashing", () => {
    const htmlGen = renderToString(
      <ModalRouter
        modal={{ type: "generator" }}
        onClose={vi.fn()}
      />
    );
    expect(htmlGen).toContain("Secure Generator");

    const htmlAudit = renderToString(
      <ModalRouter
        modal={{ type: "readiness_audit", project: mockProject }}
        onClose={vi.fn()}
      />
    );
    expect(htmlAudit).toContain("Operational Readiness");
  });

  it("renders WelcomeScreen without crashing and displays zero-knowledge tagline and buttons", () => {
    const onSelect = vi.fn();
    const html = renderToString(<WelcomeScreen onSelect={onSelect} />);
    expect(html).toContain("CUSTODIAN");
    expect(html).toContain("Your secrets, your keys. Not even we can see them.");
    expect(html).toContain("Create Account");
    expect(html).toContain("Log In");
  });

  it("renders LandingPage marketing page with nav, 3 feature cards, and 3 pricing tiers", () => {
    const html = renderToString(<LandingPage onLogin={vi.fn()} onSignup={vi.fn()} />);
    expect(html).toContain("CUSTODIAN");
    expect(html).toContain("The Zero-Knowledge Secret Vault &amp; Client Handover Platform");
    expect(html).toContain("Zero-Knowledge Encryption");
    expect(html).toContain("Secure Sharing");
    expect(html).toContain("Renewal Watchdog");
    expect(html).toContain("Free");
    expect(html).toContain("Pro");
    expect(html).toContain("Team");
    expect(html).toContain("Get Started Free");
    expect(html).toContain("Privacy Policy");
  });

  it("renders AdminSupportPanel for founder with title, filters, and refresh button", () => {
    const founderUser = { id: "founder-1", email: "ygpksr456@gmail.com" };
    const founderProfile = { id: "founder-1", email: "ygpksr456@gmail.com", role: "founder", plan: "founder" };
    const html = renderToString(
      <AdminSupportPanel
        currentUser={founderUser}
        profile={founderProfile}
        onExit={vi.fn()}
      />
    );
    expect(html).toContain("Founder Support Desk");
    expect(html).toContain("FOUNDER ONLY");
    expect(html).toContain("FILTER:");
    expect(html).toContain("All (0)");
    expect(html).toContain("Open (0)");
    expect(html).toContain("Resolved (0)");
    expect(html).toContain("Refresh");
    expect(html).toContain("Back to Vault");
  });

  it("renders AdminSupportPanel Access Denied 403 when user is not founder", () => {
    const regularUser = { id: "user-99", email: "client@example.com" };
    const regularProfile = { id: "user-99", email: "client@example.com", role: "member", plan: "free" };
    const html = renderToString(
      <AdminSupportPanel
        currentUser={regularUser}
        profile={regularProfile}
        onExit={vi.fn()}
      />
    );
    expect(html).toContain("Access Denied (403)");
    expect(html).toContain("client@example.com");
    expect(html).toContain("Return to Your Vault");
  });
});

