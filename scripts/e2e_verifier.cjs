const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function adb(args) {
  try {
    return execFileSync("adb", args, { encoding: "utf8" });
  } catch (err) {
    return err.stdout || err.message;
  }
}

function tap(x, y) {
  adb(["shell", "input", "tap", String(x), String(y)]);
}

function type(text) {
  adb(["shell", "input", "text", text]);
}

function key(code) {
  adb(["shell", "input", "keyevent", String(code)]);
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function snap(name) {
  const img = execFileSync("adb", ["exec-out", "screencap", "-p"]);
  const filePath = path.join(__dirname, `../${name}.png`);
  fs.writeFileSync(filePath, img);
  console.log(`[Snap] Saved: ${name}.png`);
  return filePath;
}

async function run() {
  console.log("=== Starting Full E2E Verification ===");

  // 1. Enter email
  console.log("1. Entering email...");
  tap(400, 340);
  sleep(500);
  type("demo@custodian.app");
  sleep(500);

  // 2. Enter password
  console.log("2. Entering password...");
  tap(400, 430);
  sleep(500);
  type("Password123");
  sleep(500);

  // Close keyboard
  key(4);
  sleep(500);

  // 3. Tap Log in
  console.log("3. Tapping Log In...");
  tap(500, 495);
  sleep(3000);
  snap("e2e_01_after_login");

  // Check if we are on Vault Unlock or if we need to sign up / create password
  // Let's tap password field on Vault Unlock (x: 400, y: 800)
  console.log("4. Entering Vault Password...");
  tap(400, 800);
  sleep(500);
  type("VaultPass123");
  sleep(500);
  key(4); // hide keyboard
  sleep(500);

  // Tap Unlock Vault button (x: 500, y: 1200 or around center)
  tap(500, 1200);
  sleep(2500);
  snap("e2e_02_vault_unlocked");
}

run();
