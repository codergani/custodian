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
  console.log(`[Screenshot] ${name}.png saved successfully.`);
  return filePath;
}

async function main() {
  console.log("=== STEP 1: Check Current Screen & Wakeup ===");
  key(224); // Wakeup
  sleep(500);
  // Dismiss any system popups
  tap(350, 1220);
  sleep(300);
  tap(350, 1365);
  sleep(500);
  snap("step01_login_view");

  console.log("=== STEP 2: Quick Demo Access ===");
  // Quick Demo Access button
  tap(500, 1200);
  sleep(500);
  tap(500, 1640);
  sleep(2500);
  snap("step02_vault_screen");

  console.log("=== STEP 3: Enter Vault Password ===");
  tap(500, 750);
  sleep(300);
  type("Password123");
  sleep(300);

  tap(500, 970);
  sleep(300);
  type("Password123");
  sleep(300);

  // Close keyboard
  key(4);
  sleep(400);

  // Tap "Set vault password" / "Unlock Vault"
  tap(500, 1110);
  sleep(300);
  tap(500, 1572);
  sleep(3000);
  snap("step03_after_vault_unlock");

  console.log("=== STEP 4: Handle Tour if Present ===");
  // Tap 'Skip' button on tour if shown
  tap(630, 1560);
  sleep(1500);
  snap("step04_owner_command_center");

  console.log("=== STEP 5: Create Client 'Apex Corp' ===");
  // Tap '+ New Client' in hero card (x: 220, y: 740)
  tap(220, 740);
  sleep(1500);
  snap("step05_add_client_modal");

  // Type client name
  type("Apex%sCorp");
  sleep(500);
  key(4); // Close keyboard
  sleep(400);

  // Tap Save / Create Client (x: 500, y: 1560)
  tap(500, 1560);
  sleep(2500);
  snap("step06_client_workspace");

  console.log("=== STEP 6: Create Project 'Website Redesign' ===");
  // Tap '+ New Project' button
  tap(500, 750);
  sleep(1500);
  snap("step07_add_project_modal");

  // Type project name
  type("Website%sRedesign");
  sleep(500);
  key(4); // Close keyboard
  sleep(400);

  // Tap Save / Create Project
  tap(500, 1560);
  sleep(2500);
  snap("step08_project_workspace");

  console.log("=== STEP 7: BUG 1 TEST — Press Back from Project Workspace ===");
  key(4); // Back button
  sleep(1500);
  snap("step09_back_level1_client_projects");

  console.log("=== STEP 8: BUG 1 TEST — Press Back from Client Workspace ===");
  key(4); // Back button
  sleep(1500);
  snap("step10_back_level2_command_center");

  console.log("=== STEP 9: BUG 1 TEST — Press Back from Root Command Center ===");
  key(4); // Back button
  sleep(1500);
  snap("step11_back_level3_app_exited");

  console.log("=== STEP 10: BUG 2 TEST — Re-open App & Unlock (Confirm No Tour Flash) ===");
  adb(["shell", "am", "start", "-n", "com.custodians.app/com.custodians.app.MainActivity"]);
  sleep(3000);
  snap("step12_second_launch_unlock_prompt");

  // Type Vault Password
  tap(500, 1200);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4); // Close keyboard
  sleep(400);

  // Tap Unlock Vault
  tap(500, 1572);
  sleep(3000);
  snap("step13_second_launch_direct_to_dashboard");

  console.log("=== ALL LIVE SCENARIOS COMPLETED ===");
}

main();
