import { networkInterfaces } from 'os';

const nets = networkInterfaces();
const results = Object.create(null); // Or just '{}', an empty object

for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
    // 'IPv4' is in Node <= 17, from 18 it's a number 4 or 6
    const familyV4Value = typeof net.family === 'string' ? 'IPv4' : 4
    if (net.family === familyV4Value && !net.internal) {
      if (!results[name]) {
        results[name] = [];
      }
      results[name].push(net.address);
    }
  }
}

/**
 * Retrieves the IP addresses for all network interfaces.
 * @returns An object containing network interface names as keys and arrays of IP addresses as values.
 */
export function getIPAddress() {
  return results;
}

/**
 * Retrieves the names of all network interfaces.
 * @returns An array of network interface names.
 */
export function getNetworkNames() {
  return Object.keys(nets);
}
