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
  console.log(`[Screenshot] ${name}.png saved.`);
  return filePath;
}

async function main() {
  console.log("=== Tap Quick Demo Access ===");
  tap(500, 1720);
  sleep(2500);
  snap("t1_set_password_view");

  console.log("=== Type Vault Passwords ===");
  tap(500, 1220);
  sleep(400);
  type("Password123");
  sleep(400);

  // Close keyboard
  key(4);
  sleep(400);

  tap(500, 1420);
  sleep(400);
  type("Password123");
  sleep(400);

  // Close keyboard
  key(4);
  sleep(400);

  console.log("=== Tap Set Vault Password button ===");
  tap(500, 1530);
  sleep(3000);
  snap("t2_after_set_vault_password");
}

main();
