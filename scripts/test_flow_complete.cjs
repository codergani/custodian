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
  fs.writeFileSync(path.join(__dirname, `../${name}.png`), img);
  console.log(`Saved screenshot: ${name}.png`);
}

async function run() {
  console.log("=== 1. Dismissing any dialogs and focusing login ===");
  tap(400, 575);
  sleep(500);
  key(4); // back to close soft keyboard if open
  sleep(500);

  snap("test_step1_login_screen");

  // Fill email (x: 400, y: 512)
  console.log("=== 2. Entering Email & Password ===");
  tap(400, 512);
  sleep(500);
  type("testowner@custodian.app");
  sleep(500);

  // Fill password (x: 400, y: 600)
  tap(400, 600);
  sleep(500);
  type("Password123");
  sleep(500);

  // Close keyboard
  key(4);
  sleep(500);

  // Tap Log In button (x: 500, y: 660)
  console.log("=== 3. Clicking Log In ===");
  tap(500, 660);
  sleep(3000);

  snap("test_step2_after_login");
}

run();
