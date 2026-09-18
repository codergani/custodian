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
  console.log("=== Step A: Dismiss First-Time Onboarding Tour ===");
  // Tap 'Skip' button on tour modal
  tap(630, 1560);
  sleep(1500);
  snap("e2e_01_owner_command_center");

  console.log("=== Step B: Open Drawer / Add Client & Project ===");
  // Open hamburger drawer menu at top left (x: 80, y: 140)
  tap(80, 140);
  sleep(1500);
  snap("e2e_02_drawer_opened");

  // Tap "+ Client" button in drawer (x: 500, y: 560)
  tap(500, 560);
  sleep(1500);
  snap("e2e_03_new_client_modal");

  // Type client name "Acme Corp"
  type("Acme%sCorp");
  sleep(500);

  // Close keyboard & tap Create / Save button (x: 500, y: 1560)
  key(4);
  sleep(500);
  tap(500, 1560);
  sleep(2000);
  snap("e2e_04_client_created_workspace");

  // Now create a project: tap "+ New Project" / "+ Project" button
  tap(500, 750);
  sleep(1500);
  snap("e2e_05_new_project_modal");

  // Type project name "Website Redesign"
  type("Website%sRedesign");
  sleep(500);
  key(4);
  sleep(500);
  // Tap Create Project button
  tap(500, 1560);
  sleep(2500);
  snap("e2e_06_project_created_view");
}

main();
