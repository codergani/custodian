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
  console.log(`[Screenshot] ${name}.png saved`);
  return filePath;
}

async function run() {
  console.log("=== Step 1: Clear and enter valid Email ===");
  tap(500, 1160);
  sleep(500);
  for (let i = 0; i < 40; i++) key(67);
  const email = `devcustodian${Math.floor(Date.now() / 1000)}@gmail.com`;
  type(email);
  sleep(500);

  // Close keyboard
  key(4);
  sleep(500);

  console.log("=== Step 2: Tap Sign up ===");
  // Sign up button is at (500, 1650) with error banner
  tap(500, 1650);
  sleep(4000);

  snap("05_vault_setup_step");
}

run();
