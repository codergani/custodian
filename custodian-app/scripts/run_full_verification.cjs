const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function adb(args) {
  try {
    return execFileSync("adb", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
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
  const img = execFileSync("adb", ["exec-out", "screencap", "-p"], { maxBuffer: 20 * 1024 * 1024 });
  const filePath = path.join(__dirname, `../${name}.png`);
  fs.writeFileSync(filePath, img);
  console.log(`[Screenshot Captured] ${name}.png`);
  return filePath;
}

async function main() {
  console.log("=== Step 1: Dismiss any system popups ===");
  tap(350, 1220);
  sleep(500);
  tap(350, 1365);
  sleep(500);

  console.log("=== Step 2: Tap Quick Demo Access ===");
  // Quick Demo Access button is at (x: 500, y: 1640)
  tap(500, 1640);
  sleep(2500);
  snap("step1_vault_unlock_view");

  console.log("=== Step 3: Enter Vault Password & Unlock ===");
  // If first time or unlock, tap password input at (x: 500, y: 1100 or 1200)
  tap(500, 1200);
  sleep(500);
  type("Password123");
  sleep(500);

  // If confirm password exists, tap at (x: 500, y: 1350)
  tap(500, 1350);
  sleep(500);
  type("Password123");
  sleep(500);

  // Close soft keyboard
  key(4);
  sleep(500);

  // Tap Unlock / Set Vault Password button at (x: 500, y: 1550)
  tap(500, 1550);
  sleep(3000);
  snap("step2_first_unlock_result");
}

main();
