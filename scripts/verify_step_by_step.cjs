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
  console.log("=== Enter Vault Password ===");
  tap(500, 1220);
  sleep(500);
  type("Password123");
  sleep(500);

  console.log("=== Enter Confirm Password ===");
  // When keyboard is open, confirm password field is shifted or we can close keyboard first
  key(4);
  sleep(500);
  tap(500, 1420);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4);
  sleep(500);

  console.log("=== Tap Set Vault Password ===");
  tap(500, 1572);
  sleep(3000);
  snap("step1_tour_on_first_unlock");

  console.log("=== Dismiss Tour ===");
  tap(630, 1560);
  sleep(1500);
  snap("step2_owner_command_center");

  console.log("=== Tap + New Client ===");
  tap(220, 740);
  sleep(1500);
  snap("step3_add_client_modal");

  console.log("=== Type Client Name ===");
  type("Apex%sCorp");
  sleep(500);
  key(4);
  sleep(500);

  // In Add Client modal, find Create Client button
  tap(500, 1560);
  sleep(3000);
  snap("step4_after_create_client");
}

main();
