const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function adb(args) {
  return execFileSync("adb", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
}

function tap(x, y) {
  console.log(`-> Tap (${x}, ${y})`);
  adb(["shell", "input", "tap", String(x), String(y)]);
}

function type(text) {
  console.log(`-> Type: "${text}"`);
  adb(["shell", "input", "text", text]);
}

function key(code, desc = "") {
  console.log(`-> Keyevent: ${code} (${desc})`);
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
  console.log("\n=== 1. Enter Vault Password & Unlock ===");
  type("Password123");
  sleep(500);
  tap(500, 900); // Tap "Unlock Vault" above soft keyboard
  sleep(3000);
  snap("final_01_command_center");

  console.log("\n=== 2. Open Drawer & Add Client 'Apex Corp' ===");
  tap(80, 140); // Hamburger drawer
  sleep(1500);
  snap("final_02_drawer_open");

  tap(200, 440); // "+ New Client" inside drawer list
  sleep(1500);
  snap("final_03_client_modal");

  type("Apex%sCorp");
  sleep(500);
  // Tap Save / Create in modal
  tap(500, 950); // or tap above keyboard
  sleep(3000);
  snap("final_04_client_workspace");

  console.log("\n=== 3. Add Project 'Website Redesign' ===");
  // Tap "+ Project" in Client Workspace
  tap(200, 700);
  sleep(1500);
  snap("final_05_project_modal");

  type("Website%sRedesign");
  sleep(500);
  tap(500, 950); // Save project
  sleep(3000);
  snap("final_06_project_workspace");

  console.log("\n=== 4. BUG 1 VERIFICATION: Back Navigation Cascade ===");
  console.log("-> 1st Back: From Project Workspace -> Client Workspace");
  key(4, "Back 1");
  sleep(2000);
  snap("final_07_back_to_client_workspace");

  console.log("-> 2nd Back: From Client Workspace -> Owner Command Center");
  key(4, "Back 2");
  sleep(2000);
  snap("final_08_back_to_command_center");

  console.log("-> 3rd Back: From Owner Command Center -> App Exit");
  key(4, "Back 3");
  sleep(2000);
  snap("final_09_app_exited");

  console.log("\n=== 5. BUG 2 VERIFICATION: Subsequent Unlock (No Intro/Tour) ===");
  adb(["shell", "am", "start", "-n", "com.custodians.app/com.custodians.app.MainActivity"]);
  sleep(3500);
  snap("final_10_reopened_unlock_prompt");

  type("Password123");
  sleep(500);
  tap(500, 900); // Tap "Unlock Vault"
  sleep(3000);
  snap("final_11_unlocked_directly_to_command_center");

  console.log("\n=== ALL COMPLETED! ===");
}

run();
