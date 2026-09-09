/**
 * Client-side throttle and debounce utilities for preventing
 * rapid repeated clicks, submission spam, and excessive search queries.
 */

export function throttle(fn, delayMs = 1000) {
  let lastCall = 0;
  return function (...args) {
    const now = Date.now();
    if (now - lastCall >= delayMs) {
      lastCall = now;
      return fn.apply(this, args);
    }
  };
}

export function debounce(fn, delayMs = 300) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delayMs);
  };
}
