const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function adb(cmd) {
  try {
    return execSync(`adb ${cmd}`, { encoding: "utf8" });
  } catch (err) {
    return err.stdout || err.message;
  }
}

function tap(x, y) {
  adb(`shell input tap ${x} ${y}`);
}

function type(text) {
  adb(`shell input text "${text}"`);
}

function key(code) {
  adb(`shell input keyevent ${code}`);
}

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function snap(name) {
  const img = execSync("adb exec-out screencap -p");
  fs.writeFileSync(path.join(__dirname, `../${name}.png`), img);
  console.log(`Saved screenshot: ${name}.png`);
}

console.log("Starting test script...");
snap("step0_initial");

// Dismiss any system prompt
tap(400, 575);
sleep(1000);
snap("step1_ready");
