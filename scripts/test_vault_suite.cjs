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
  console.log(`[Snap] Saved: ${name}.png`);
  return filePath;
}

async function run() {
  console.log("=== 1. Enter First Vault Password ===");
  type("Password123");
  sleep(500);

  console.log("=== 2. Enter Confirm Vault Password ===");
  tap(500, 970);
  sleep(500);
  type("Password123");
  sleep(500);

  // Close keyboard
  key(4);
  sleep(500);

  console.log("=== 3. Tap Set Vault Password ===");
  // Without keyboard, "Set vault password" button is at (500, 1110)
  tap(500, 1110);
  sleep(3000);
  snap("test_01_first_unlock_result");
}

run();
