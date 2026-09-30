const fs = require('fs');
const path = require('path');

const { execSync } = require('child_process');

function getGitHubToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/:([^:@]+)@github\.com/);
    if (match && match[1]) return match[1];
  } catch {}
  return '';
}

const GITHUB_TOKEN = getGitHubToken();
const OWNER = 'codergani';
const REPO = 'custodian';
const TAG = 'v1.0.0';
const APK_PATH = path.resolve(__dirname, '../custodian-latest.apk');

async function uploadRelease() {
  const headers = {
    'User-Agent': 'Custodian-Release-Uploader',
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
  };

  console.log(`[Release] Fetching release details for ${TAG}...`);
  const relRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/tags/${TAG}`, { headers });
  if (!relRes.ok) {
    throw new Error(`Failed to fetch release: ${relRes.status} ${await relRes.text()}`);
  }
  const release = await relRes.json();
  console.log(`[Release] Found release ID: ${release.id}`);

  // Check if custodian-latest.apk already exists
  const existingAsset = release.assets?.find(a => a.name === 'custodian-latest.apk');
  if (existingAsset) {
    console.log(`[Release] Deleting existing asset ID ${existingAsset.id} (${existingAsset.name})...`);
    const delRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/releases/assets/${existingAsset.id}`, {
      method: 'DELETE',
      headers,
    });
    console.log(`[Release] Asset delete status: ${delRes.status}`);
  }

  // Upload new asset
  const apkBuffer = fs.readFileSync(APK_PATH);
  const sizeMb = (apkBuffer.length / (1024 * 1024)).toFixed(2);
  console.log(`[Release] Uploading new APK (${sizeMb} MB) to release ${release.id}...`);

  const uploadUrl = `https://uploads.github.com/repos/${OWNER}/${REPO}/releases/${release.id}/assets?name=custodian-latest.apk`;
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': String(apkBuffer.length),
    },
    body: apkBuffer,
  });

  if (!uploadRes.ok) {
    throw new Error(`Upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }

  const uploadedAsset = await uploadRes.json();
  console.log(`[Release] Successfully uploaded!`);
  console.log(`[Release] Download URL: ${uploadedAsset.browser_download_url}`);
  console.log(`[Release] Asset Size: ${(uploadedAsset.size / (1024 * 1024)).toFixed(2)} MB`);
}

uploadRelease().catch(err => {
  console.error('[Release] Error:', err);
  process.exit(1);
});
