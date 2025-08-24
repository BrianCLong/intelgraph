import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEnrollmentTicket, enrollDevice, getDevice } from '../dist/src/index.js';

test('device enrollment round trip', () => {
  const ticket = createEnrollmentTicket('t1');
  const device = enrollDevice(ticket.code, 'pubkey', 'Unit Test Device');
  const fetched = getDevice(device.id);
  assert.equal(fetched?.name, 'Unit Test Device');
});
