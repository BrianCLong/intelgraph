export interface Device {
  id: string;
  tenantId: string;
  name: string;
  publicKey: string;
  status: 'ACTIVE' | 'SUSPENDED';
  enrolledAt: string;
  capabilities: { camera: boolean; gps: boolean; mic: boolean };
  wipeNonce: string;
}

export interface EnrollmentTicket {
  code: string;
  expiresAt: string;
}

function randHex(size: number): string {
  let out = '';
  for (let i = 0; i < size; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}

const devices = new Map<string, Device>();
const tickets = new Map<string, EnrollmentTicket>();

export function createEnrollmentTicket(tenantId: string): EnrollmentTicket {
  const code = randHex(6);
  const ticket = { code, expiresAt: new Date(Date.now() + 600000).toISOString() };
  tickets.set(code, ticket);
  return ticket;
}

export function enrollDevice(code: string, devicePubKey: string, name: string): Device {
  const ticket = tickets.get(code);
  if (!ticket) throw new Error('invalid-code');
  tickets.delete(code);
  const device: Device = {
    id: randHex(16),
    tenantId: 't1',
    name,
    publicKey: devicePubKey,
    status: 'ACTIVE',
    enrolledAt: new Date().toISOString(),
    capabilities: { camera: true, gps: true, mic: true },
    wipeNonce: randHex(16)
  };
  devices.set(device.id, device);
  return device;
}

export function getDevice(id: string): Device | undefined {
  return devices.get(id);
}
