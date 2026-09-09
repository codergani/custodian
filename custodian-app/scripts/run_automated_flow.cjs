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
  console.log("=== 1. Tap Close App on dialog & Tap Quick Demo Access ===");
  tap(350, 1248);
  sleep(500);
  tap(500, 1700);
  sleep(3000);
  snap("step1_after_quick_demo");

  console.log("=== 2. Set Vault Password ===");
  // Focus vault password (x: 500, y: 1220)
  tap(500, 1220);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4); // Close keyboard
  sleep(500);

  // Focus confirm password (x: 500, y: 1420)
  tap(500, 1420);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4); // Close keyboard
  sleep(500);

  // Tap "Set vault password" button (x: 500, y: 1560)
  tap(500, 1560);
  sleep(3500);
  snap("step2_first_unlock_tour");

  console.log("=== 3. Dismiss Onboarding Tour ===");
  // Tap 'Skip' button on tour modal (x: 630, y: 1560)
  tap(630, 1560);
  sleep(2000);
  snap("step3_owner_command_center");

  console.log("=== 4. Add Client 'Apex Corp' ===");
  // Tap "+ New Client" hero button (x: 220, y: 740)
  tap(220, 740);
  sleep(1500);
  snap("step4_new_client_dialog");

  // Type client name
  type("Apex%sCorp");
  sleep(500);
  key(4); // Close keyboard
  sleep(500);

  // Tap Create / Save Client button in dialog (x: 500, y: 1560)
  tap(500, 1560);
  sleep(3000);
  snap("step5_client_workspace");

  console.log("=== 5. Add Project 'Website Redesign' ===");
  // Tap "+ Project" or "+ New Project" button (x: 220, y: 650 or x: 500, y: 750)
  tap(220, 650);
  sleep(1500);
  snap("step6_new_project_dialog");

  type("Website%sRedesign");
  sleep(500);
  key(4);
  sleep(500);
  tap(500, 1560);
  sleep(3000);
  snap("step7_project_workspace_5tabs");

  console.log("=== 6. BUG 1 VERIFICATION — Back from Project Workspace ===");
  key(4);
  sleep(2000);
  snap("step8_back_to_client_workspace");

  console.log("=== 7. BUG 1 VERIFICATION — Back from Client Workspace ===");
  key(4);
  sleep(2000);
  snap("step9_back_to_command_center");

  console.log("=== 8. BUG 1 VERIFICATION — Back from Root Command Center ===");
  key(4);
  sleep(2000);
  snap("step10_app_exited_to_home");

  console.log("=== 9. BUG 2 VERIFICATION — Re-open App & Unlock ===");
  adb(["shell", "am", "start", "-n", "com.custodians.app/com.custodians.app.MainActivity"]);
  sleep(3500);
  snap("step11_reopened_unlock_prompt");

  // Type Password
  tap(500, 1220);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4);
  sleep(500);

  // Tap Unlock Vault (x: 500, y: 1560)
  tap(500, 1560);
  sleep(3000);
  snap("step12_second_unlock_direct_dashboard_no_tour");

  console.log("=== COMPLETED ALL E2E STEPS ===");
}

main();
