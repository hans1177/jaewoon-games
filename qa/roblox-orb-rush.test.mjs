import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = 'roblox-games/orb-rush';
const project = JSON.parse(fs.readFileSync(`${root}/default.project.json`, 'utf8'));
const config = fs.readFileSync(`${root}/shared/Config.luau`, 'utf8');
const server = fs.readFileSync(`${root}/server/Main.server.luau`, 'utf8');
const client = fs.readFileSync(`${root}/client/Main.client.luau`, 'utf8');

assert.equal(project.name, 'OrbRush');
assert.equal(project.tree?.ReplicatedStorage?.OrbRushShared?.$path, 'shared');
assert.equal(project.tree?.ServerScriptService?.OrbRush?.$path, 'server');
assert.equal(project.tree?.StarterPlayer?.StarterPlayerScripts?.OrbRush?.$path, 'client');

assert.match(config, /GameId\s*=\s*"orb-rush"/);
assert.match(config, /MobileFirst\s*=\s*true/);
assert.match(config, /SaveEnabled\s*=\s*false/);
assert.match(config, /MultiplayerEnabled\s*=\s*true/);

assert.match(server, /RemoteEvent/);
assert.match(server, /roundState:FireAllClients/);
assert.doesNotMatch(server, /OnServerEvent/);
assert.match(server, /IntValue/);
assert.match(server, /ScoreOrb/);
assert.match(server, /humanoid:TakeDamage/);
assert.match(server, /Players:GetPlayerFromCharacter/);
assert.match(server, /winnerMessage/);

assert.match(client, /roundState\.OnClientEvent/);
assert.doesNotMatch(client, /FireServer/);
assert.match(client, /UserInputService\.TouchEnabled/);
assert.match(client, /leaderstats/);
assert.match(client, /Score/);

console.log('PASS Orb Rush source contract: server authority, mobile HUD, and Rojo mapping');
