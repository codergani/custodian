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
  console.log("\n=== STEP 1: Auth into Quick Demo ===");
  key(4, "Hide Keyboard");
  sleep(500);
  tap(500, 1700); // Quick demo access
  sleep(3500);
  snap("flow_01_auth_done");

  console.log("\n=== STEP 2: Handle Password / Unlock if needed ===");
  // Check if we need to unlock vault or set password
  tap(500, 1220); // Focus password
  sleep(500);
  type("Password123");
  sleep(500);
  key(4, "Hide Keyboard");
  sleep(500);

  // If set password, also fill repeat password
  tap(500, 1420);
  sleep(500);
  type("Password123");
  sleep(500);
  key(4, "Hide Keyboard");
  sleep(500);

  // Tap action button (Set vault password or Unlock)
  tap(500, 1560);
  sleep(3500);
  snap("flow_02_dashboard");

  console.log("\n=== STEP 3: Open Sidebar Drawer or Tap New Client ===");
  // Let's tap the Hamburger menu at (x: 80, y: 140) to test sidebar navigation or add client
  tap(80, 140);
  sleep(1500);
  snap("flow_03_sidebar_drawer");

  // In sidebar drawer, tap "+ New Client" (x: 200, y: 380)
  tap(200, 380);
  sleep(1500);
  snap("flow_04_client_modal");

  // Type client name
  type("Apex%sCorp");
  sleep(500);
  key(4, "Hide Keyboard");
  sleep(500);

  // Tap "Save Client" or "Create Client" button in modal (x: 500, y: 1400)
  tap(500, 1400);
  sleep(3000);
  snap("flow_05_client_created_view");

  // In Client View, tap "+ Project" button (x: 200, y: 480 or x: 200, y: 550)
  tap(200, 480);
  sleep(1500);
  snap("flow_06_project_modal");

  type("Website%sRedesign");
  sleep(500);
  key(4, "Hide Keyboard");
  sleep(500);

  tap(500, 1400);
  sleep(3000);
  snap("flow_07_project_workspace_active");

  console.log("\n=== STEP 4: BUG 1 VERIFICATION — BACK NAVIGATION HIERARCHY ===");
  console.log("--> Testing 1st Back Press (Project Workspace -> Client Workspace)...");
  key(4, "Back 1");
  sleep(2000);
  snap("flow_08_back_1_client_workspace");

  console.log("--> Testing 2nd Back Press (Client Workspace -> Command Center)...");
  key(4, "Back 2");
  sleep(2000);
  snap("flow_09_back_2_command_center");

  console.log("--> Testing 3rd Back Press (Root Command Center -> Exit App)...");
  key(4, "Back 3");
  sleep(2000);
  snap("flow_10_back_3_exited_app");

  console.log("\n=== STEP 5: BUG 2 VERIFICATION — 2ND UNLOCK DIRECT TO DASHBOARD ===");
  adb(["shell", "am", "start", "-n", "com.custodians.app/com.custodians.app.MainActivity"]);
  sleep(3500);
  snap("flow_11_reopen_unlock_view");

  tap(500, 1220); // Focus password
  sleep(500);
  type("Password123");
  sleep(500);
  key(4, "Hide Keyboard");
  sleep(500);

  tap(500, 1560); // Tap Unlock Vault
  sleep(3000);
  snap("flow_12_unlock_2_direct_to_command_center_no_tour");

  console.log("\n=== COMPLETE RUN FINISHED ===");
}

run();
