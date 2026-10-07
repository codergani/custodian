// Auto-clearing clipboard utility for sensitive vault secrets and passwords
let clipTimer = null;
let lastCopiedSecret = null;

/**
 * Copies sensitive text to the clipboard and automatically wipes it after timeoutMs (default 30s)
 * to prevent shoulder-surfing, rogue clipboard-scraping apps, and memory persistence.
 *
 * @param {string} text - The secret text to copy
 * @param {number} [timeoutMs=30000] - Duration in ms before wiping clipboard
 * @returns {Promise<boolean>}
 */
export async function copySecretWithAutoClear(text, timeoutMs = 30000) {
  if (!text) return false;
  try {
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      // Fallback for older environments
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }

    lastCopiedSecret = text;

    if (clipTimer) clearTimeout(clipTimer);
    clipTimer = setTimeout(async () => {
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const current = await navigator.clipboard.readText();
          if (current === lastCopiedSecret) {
            await navigator.clipboard.writeText("");
          }
        }
      } catch {
        // In case clipboard read is blocked by browser policy without active focus
      }
    }, timeoutMs);

    return true;
  } catch (err) {
    console.warn("Failed to copy text to clipboard:", err);
    return false;
  }
}
