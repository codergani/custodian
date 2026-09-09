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
  console.log("=== Step A: Hide Keyboard ===");
  key(4);
  sleep(500);
  snap("flow_login_clean");

  console.log("=== Step B: Tap Email ===");
  // Email input is around (x: 400, y: 780 in 2400-pixel space without keyboard)
  // Let's inspect flow_login_clean.png coordinates
}

run();
