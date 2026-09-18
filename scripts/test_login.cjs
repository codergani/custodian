const { execFileSync, execSync } = require("child_process");
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

console.log("=== Current Screen ===");
snap("login_current");
