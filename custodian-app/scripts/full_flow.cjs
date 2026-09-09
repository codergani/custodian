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
  console.log("=== 1. Tap Quick Demo Access ===");
  tap(500, 1700);
  sleep(3000);
  snap("flow01_set_vault_password_screen");

  console.log("=== 2. Set Vault Password ===");
  // Focus vault password
  tap(500, 1220);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4); // Close keyboard
  sleep(500);

  // Focus confirm password
  tap(500, 1420);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4); // Close keyboard
  sleep(500);

  // Tap "Set vault password" button
  tap(500, 1560);
  sleep(3000);
  snap("flow02_first_unlock_tour_modal");

  console.log("=== 3. Dismiss Onboarding Tour ===");
  // Tap 'Skip' (x: 630, y: 1560)
  tap(630, 1560);
  sleep(2000);
  snap("flow03_owner_command_center");

  console.log("=== 4. Add Client 'Apex Corp' ===");
  // Tap "+ New Client" in hero banner (x: 220, y: 740)
  tap(220, 740);
  sleep(1500);
  snap("flow04_new_client_dialog");

  // Type client name
  type("Apex%sCorp");
  sleep(500);
  key(4);
  sleep(500);
  // Tap Save / Create
  tap(500, 1560);
  sleep(3000);
  snap("flow05_client_overview");

  console.log("=== 5. Add Project 'Website Redesign' ===");
  // Tap "+ Project" or "+ New Project" button (x: 220, y: 650 or x: 500, y: 750)
  tap(220, 650);
  sleep(1500);
  snap("flow06_new_project_dialog");

  type("Website%sRedesign");
  sleep(500);
  key(4);
  sleep(500);
  tap(500, 1560);
  sleep(3000);
  snap("flow07_project_workspace_5tabs");

  console.log("=== 6. BUG 1 VERIFICATION — Back from Project Workspace ===");
  // Hardware back button should go from Project Workspace back to Client Workspace
  key(4);
  sleep(2000);
  snap("flow08_back_to_client_workspace");

  console.log("=== 7. BUG 1 VERIFICATION — Back from Client Workspace ===");
  // Hardware back button should go from Client Workspace back to Owner Command Center
  key(4);
  sleep(2000);
  snap("flow09_back_to_command_center");

  console.log("=== 8. BUG 1 VERIFICATION — Back from Owner Command Center Root ===");
  // Hardware back button from root should exit the app
  key(4);
  sleep(2000);
  snap("flow10_app_exited_to_home");

  console.log("=== 9. BUG 2 VERIFICATION — Re-open App & Unlock (No Intro Screen) ===");
  adb(["shell", "am", "start", "-n", "com.custodians.app/com.custodians.app.MainActivity"]);
  sleep(3500);
  snap("flow11_reopened_unlock_prompt");

  // Focus password & type
  tap(500, 1220);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4);
  sleep(500);

  // Tap Unlock Vault
  tap(500, 1560);
  sleep(3000);
  snap("flow12_second_unlock_direct_dashboard_no_tour");

  console.log("=== ALL DONE SUCCESSFULLY ===");
}

main();
