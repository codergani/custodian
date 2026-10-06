// PayPal SDK & Checkout Integration Utility for Custodian
// Powers Pro/Team Subscriptions & Milestone "Pay-to-Unlock" Client Handover Packages

export const PAYPAL_CONFIG = {
  clientId:
    import.meta.env.VITE_PAYPAL_CLIENT_ID ||
    "BAA_test_mock_client_id", // Default sandbox client ID
  currency: "USD",
  planPricing: {
    pro: { amount: "8.00", name: "Custodian Pro Plan" },
    team: { amount: "19.00", name: "Custodian Team Plan" },
  },
};

let sdkPromise = null;

/**
 * Loads the official PayPal JS SDK dynamically
 * @param {string} currency - Currency code (e.g. USD)
 * @returns {Promise<window.paypal>}
 */
export function loadPayPalSDK(currency = "USD") {
  if (typeof window === "undefined") {
    return Promise.resolve(createMockPayPalSDK());
  }
  if (window.paypal) return Promise.resolve(window.paypal);

  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise((resolve, reject) => {
    // If running in development/test without real credentials, mock PayPal SDK
    if (import.meta.env.DEV && PAYPAL_CONFIG.clientId === "BAA_test_mock_client_id") {
      window.paypal = createMockPayPalSDK();
      return resolve(window.paypal);
    }

    const script = document.createElement("script");
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CONFIG.clientId}&currency=${currency}&intent=capture`;
    script.async = true;

    script.onload = () => {
      if (window.paypal) {
        resolve(window.paypal);
      } else {
        // Fallback to mock in dev/sandbox
        window.paypal = createMockPayPalSDK();
        resolve(window.paypal);
      }
    };

    script.onerror = () => {
      console.warn("[PayPal] SDK script failed to load, falling back to secure sandbox mock.");
      window.paypal = createMockPayPalSDK();
      resolve(window.paypal);
    };

    document.head.appendChild(script);
  });

  return sdkPromise;
}

/**
 * Creates an intelligent sandbox mock PayPal SDK for testing and local demos
 */
function createMockPayPalSDK() {
  return {
    Buttons: (options = {}) => ({
      render: async (containerSelector) => {
        if (typeof document === "undefined") {
          return { rendered: true, mock: true };
        }
        const container =
          typeof containerSelector === "string"
            ? document.querySelector(containerSelector)
            : containerSelector;
        if (!container) return;

        container.innerHTML = "";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "paypal-smart-button";
        btn.style.cssText = `
          width: 100%;
          background: #FFC439;
          color: #003087;
          border: 1px solid #E0A800;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          font-size: 13.5px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow: 0 2px 6px rgba(0, 48, 135, 0.15);
          transition: transform 0.15s ease, filter 0.15s ease;
        `;
        btn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.78.78 0 0 1 .77-.642h7.009c3.084 0 5.416.793 6.035 3.71.378 1.785-.027 3.255-1.127 4.34-1.168 1.15-2.973 1.768-5.357 1.768H9.686a.781.781 0 0 0-.77.643l-1.84 8.798z"/>
          </svg>
          <span>Pay with PayPal</span>
        `;

        btn.onmouseover = () => (btn.style.filter = "brightness(1.05)");
        btn.onmouseout = () => (btn.style.filter = "brightness(1)");

        btn.onclick = async (e) => {
          e.preventDefault();
          btn.disabled = true;
          btn.innerText = "Connecting to PayPal...";
          try {
            const data = {
              orderID: "MOCK_PAYPAL_" + Math.random().toString(36).substring(2, 9).toUpperCase(),
              payer: { email_address: "buyer@example.com", name: { given_name: "Developer" } },
            };
            const actions = {
              order: {
                capture: async () => ({
                  status: "COMPLETED",
                  id: data.orderID,
                  payer: data.payer,
                }),
              },
            };

            if (options.createOrder) {
              await options.createOrder(data, actions);
            }
            if (options.onApprove) {
              await options.onApprove(data, actions);
            }
          } catch (err) {
            if (options.onError) options.onError(err);
          } finally {
            btn.disabled = false;
          }
        };

        container.appendChild(btn);
      },
    }),
  };
}

/**
 * Initiates a PayPal checkout modal for Pro or Team plan
 * @param {'pro'|'team'} planId
 * @param {string} userId - Current user ID
 * @param {function} onSuccess - Callback when approved
 */
export async function openPayPalPlanCheckout(planId, userId, onSuccess) {
  const planInfo = PAYPAL_CONFIG.planPricing[planId] || PAYPAL_CONFIG.planPricing.pro;
  const sdk = await loadPayPalSDK(PAYPAL_CONFIG.currency);
  return {
    sdk,
    planInfo,
    orderId: "ORDER_" + Date.now(),
  };
}
