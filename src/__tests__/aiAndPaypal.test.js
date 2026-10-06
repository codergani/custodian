import { describe, it, expect } from 'vitest';
import { analyzeEnvSecurity, generateClientRunbook, optimizeBillingWithAI } from '../utils/aiCopilot';
import { loadPayPalSDK, openPayPalPlanCheckout, PAYPAL_CONFIG } from '../utils/paypal';

describe('AI Copilot & Security Auditing Suite', () => {
  it('handles empty credentials gracefully', () => {
    const report = analyzeEnvSecurity([], 'production');
    expect(report.score).toBe(100);
    expect(report.riskLevel).toBe('LOW');
    expect(report.issues.length).toBe(1);
  });

  it('detects AWS Root/Long-lived Access Keys', () => {
    const credentials = [
      { id: '1', title: 'AWS Production Root Key', username: 'AKIAIOSFODNN7EXAMPLE' }
    ];
    const report = analyzeEnvSecurity(credentials, 'production');
    expect(report.score).toBeLessThan(100);
    expect(report.issues.some(i => i.title.includes('AWS'))).toBe(true);
    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('flags Stripe test keys inside production scopes', () => {
    const credentials = [
      { id: '2', title: 'Stripe Test Secret', service: 'stripe-test-api' }
    ];
    const report = analyzeEnvSecurity(credentials, 'production');
    expect(report.score).toBeLessThanOrEqual(75);
    expect(report.issues.some(i => i.level === 'CRITICAL')).toBe(true);
  });

  it('generates an executive client handover runbook markdown without leaking secrets', () => {
    const project = { name: 'Acme SaaS Portal', clientName: 'Globex Corp' };
    const credentials = [
      { title: 'Postgres DB', environment: 'Production', renewalDate: 'Monthly' },
      { title: 'SendGrid API', environment: 'Production', renewalDate: 'Annual' }
    ];
    const markdown = generateClientRunbook(project, credentials);
    expect(markdown).toContain('Acme SaaS Portal');
    expect(markdown).toContain('Globex Corp');
    expect(markdown).toContain('Postgres DB');
    expect(markdown).toContain('Zero-Knowledge Security Copilot');
  });

  it('evaluates SaaS subscriptions and detects cost reduction opportunities', () => {
    const subscriptions = [
      { name: 'Mixpanel', category: 'Analytics', cost: 150, cycle: 'monthly' },
      { name: 'PostHog', category: 'Analytics', cost: 120, cycle: 'monthly' },
      { name: 'Vercel Pro', category: 'Hosting', cost: 40, cycle: 'monthly' }
    ];
    const analysis = optimizeBillingWithAI(subscriptions);
    expect(analysis.totalMonthlySpend).toBe(310);
    expect(analysis.potentialMonthlySavings).toBeGreaterThan(0);
    expect(analysis.opportunities.length).toBeGreaterThan(0);
  });
});

describe('PayPal SDK & Checkout Integration Suite', () => {
  it('contains valid PayPal configuration', () => {
    expect(PAYPAL_CONFIG.currency).toBe('USD');
    expect(PAYPAL_CONFIG.planPricing.pro.amount).toBe('8.00');
    expect(PAYPAL_CONFIG.planPricing.team.amount).toBe('19.00');
  });

  it('loads PayPal SDK in mock/test mode without error', async () => {
    const sdk = await loadPayPalSDK();
    expect(sdk).toBeDefined();
    expect(typeof sdk.Buttons).toBe('function');
  });

  it('renders a PayPal smart button to a container element or headless mock', async () => {
    const sdk = await loadPayPalSDK();
    const buttons = sdk.Buttons();
    const res = await buttons.render('#paypal-button-container');
    expect(res).toBeDefined();
  });

  it('initiates openPayPalPlanCheckout successfully', async () => {
    const checkout = await openPayPalPlanCheckout('pro', 'user_123');
    expect(checkout.planInfo.amount).toBe('8.00');
    expect(checkout.orderId).toContain('ORDER_');
  });
});
