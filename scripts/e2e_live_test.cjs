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

async function run() {
  console.log("=== Step 1: Enter Vault Passwords ===");
  tap(500, 1220); // Focus vault password
  sleep(600);
  type("Password123");
  sleep(600);
  key(4); // Hide soft keyboard
  sleep(600);

  tap(500, 1420); // Focus confirm password
  sleep(600);
  type("Password123");
  sleep(600);
  key(4); // Hide soft keyboard
  sleep(600);

  console.log("=== Step 2: Tap 'Set vault password' Button ===");
  tap(500, 1560);
  sleep(3500);
  snap("e2e_01_tour_on_first_unlock");

  console.log("=== Step 3: Dismiss Tour Modal via 'Skip' ===");
  tap(630, 1560); // Tap Skip
  sleep(2000);
  snap("e2e_02_owner_command_center");

  console.log("=== Step 4: Add New Client 'Apex Corp' ===");
  tap(220, 740); // Tap "+ New Client"
  sleep(1500);
  snap("e2e_03_create_client_modal");

  type("Apex%sCorp");
  sleep(600);
  key(4);
  sleep(600);
  // Tap Save Client (in modal, primary button is around x: 500, y: 1560 or check modal button)
  tap(500, 1560);
  sleep(3000);
  snap("e2e_04_client_workspace");

  console.log("=== Step 5: Add New Project 'Website Redesign' ===");
  tap(220, 650); // Tap "+ Project" or "+ New Project"
  sleep(1500);
  snap("e2e_05_create_project_modal");

  type("Website%sRedesign");
  sleep(600);
  key(4);
  sleep(600);
  tap(500, 1560);
  sleep(3000);
  snap("e2e_06_project_workspace_5tabs");

  console.log("=== Step 6: BUG 1 TEST — Back Button from Project Workspace ===");
  // Press Android hardware back button
  key(4);
  sleep(2000);
  snap("e2e_07_back_step1_client_workspace");

  console.log("=== Step 7: BUG 1 TEST — Back Button from Client Workspace ===");
  // Press Android hardware back button again
  key(4);
  sleep(2000);
  snap("e2e_08_back_step2_command_center");

  console.log("=== Step 8: BUG 1 TEST — Back Button from Command Center Root ===");
  // Press Android hardware back button a 3rd time (should cleanly exit to Android home)
  key(4);
  sleep(2000);
  snap("e2e_09_back_step3_app_exited");

  console.log("=== Step 9: BUG 2 TEST — Re-launch App & 2nd Unlock ===");
  adb(["shell", "am", "start", "-n", "com.custodians.app/com.custodians.app.MainActivity"]);
  sleep(3500);
  snap("e2e_10_reopen_unlock_prompt");

  tap(500, 1220); // Focus password
  sleep(600);
  type("Password123");
  sleep(600);
  key(4);
  sleep(600);

  // Tap "Unlock Vault"
  tap(500, 1560);
  sleep(3000);
  snap("e2e_11_second_unlock_direct_dashboard_no_tour");

  console.log("=== ALL LIVE TESTS COMPLETED ===");
}

run();
