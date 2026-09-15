// Fake authorized Roblox copy-enabled downloader used only by Vibe2 unit QA.
import fs from 'node:fs';
import path from 'node:path';

const output = String(process.env.VIBE2_ROBLOX_DOWNLOAD_OUTPUT || '').trim();
const nonce = String(process.env.VIBE2_ROBLOX_DOWNLOAD_NONCE || '').trim();
const placeId = String(process.env.VIBE2_ROBLOX_PLACE_ID || '').trim();
const permission = String(process.env.VIBE2_ROBLOX_COPY_PERMISSION || '').trim();
const permissionEvidence = String(process.env.VIBE2_ROBLOX_PERMISSION_EVIDENCE || '').trim();
if (!output || !nonce || !placeId || !permission || !permissionEvidence) process.exit(2);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `<?xml version="1.0" encoding="utf-8"?>
<roblox version="4">
  <Item class="Script"><Properties>
    <string name="Name">ServerMain</string>
    <ProtectedString name="Source"><![CDATA[
      local DSS = game:GetService("DataStoreService")
      local RS = game:GetService("RunService")
      local remote = Instance.new("RemoteEvent")
      local PFS = game:GetService("PathfindingService")
    ]]></ProtectedString>
  </Properties></Item>
  <Item class="LocalScript"><Properties>
    <string name="Name">ClientMain</string>
    <ProtectedString name="Source"><![CDATA[
      local UIS = game:GetService("UserInputService")
      local CAS = game:GetService("ContextActionService")
      local MPS = game:GetService("MarketplaceService")
      local hum = Instance.new("Humanoid")
    ]]></ProtectedString>
  </Properties></Item>
</roblox>\n`, 'utf8');
const result = {
  version: 1,
  authority: 'vibe2-roblox-authorized-download',
  nonce,
  placeId,
  copyAllowed: true,
  permission,
  permissionEvidence,
  outputPath: output
};
console.log(`VIBE2_ROBLOX_AUTHORIZED_DOWNLOAD_RESULT_BASE64=${Buffer.from(JSON.stringify(result), 'utf8').toString('base64')}`);
