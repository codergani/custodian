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
  console.log("=== 1. Check Login Screen ===");
  sleep(2000);
  snap("final_01_login_screen");

  console.log("=== 2. Tap Quick Demo Access ===");
  // Quick Demo Access button is below Log In button (x: 500, y: 1640)
  tap(500, 1640);
  sleep(2500);
  snap("final_02_vault_setup_screen");

  console.log("=== 3. Setting Vault Password ===");
  // Tap first vault password input (x: 500, y: 1100)
  tap(500, 1100);
  sleep(500);
  type("Password123");
  sleep(500);

  // Tap second vault password input (x: 500, y: 1300)
  tap(500, 1300);
  sleep(500);
  type("Password123");
  sleep(500);

  // Close keyboard
  key(4);
  sleep(500);

  // Tap Set Vault Password / Unlock button (x: 500, y: 1460)
  tap(500, 1460);
  sleep(3000);
  snap("final_03_first_unlock_screen");
}

main();
