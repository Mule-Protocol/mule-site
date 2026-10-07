// Preloaded only for CI/local build verification, never shipped to the browser.
// Throw before Node opens a socket or sends a fetch; child Node processes inherit NODE_OPTIONS.
import net from 'node:net';
import dgram from 'node:dgram';
import dns from 'node:dns';
import { syncBuiltinESMExports } from 'node:module';
const deny = () => { throw new Error('Offline build: network access is forbidden'); };
net.Socket.prototype.connect = deny;
dgram.Socket.prototype.connect = deny;
dgram.Socket.prototype.send = deny;
for (const name of Object.keys(dns)) {
  if (name === 'lookup' || name.startsWith('resolve') || name === 'reverse') dns[name] = deny;
}
for (const name of Object.keys(dns.promises)) {
  if (name === 'lookup' || name.startsWith('resolve') || name === 'reverse') dns.promises[name] = deny;
}
globalThis.fetch = deny;
syncBuiltinESMExports();
