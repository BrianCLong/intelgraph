const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const { pipeline } = require('stream/promises');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

async function resolveOpa(opts = {}) {
  const platform = process.platform;
  const exe = platform === 'win32' ? 'opa.exe' : 'opa';
  const target = opts.opaPath || path.join(os.tmpdir(), exe);
  if (fs.existsSync(target)) return target;

  const urls = {
    linux: 'https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static',
    darwin: 'https://openpolicyagent.org/downloads/latest/opa_darwin_amd64_static',
    win32: 'https://openpolicyagent.org/downloads/latest/opa_windows_amd64.exe',
  };
  const downloadUrl = opts.opaUrl || process.env.OPA_URL || urls[platform] || urls.linux;
  try {
    const proto = downloadUrl.startsWith('https') ? https : http;
    try {
      const res = await new Promise((resolve, reject) => {
        proto
          .get(downloadUrl, (r) => {
            if (r.statusCode && r.statusCode >= 400) {
              reject(new Error(`HTTP ${r.statusCode}`));
            } else {
              resolve(r);
            }
          })
          .on('error', reject);
      });
      await pipeline(res, fs.createWriteStream(target));
    } catch {
      await execFileAsync('curl', ['-sS', '-L', '-o', target, downloadUrl]);
    }
    await fsp.chmod(target, 0o755);
    const expected = opts.opaSha256 || process.env.OPA_SHA256;
    if (expected) {
      const buf = await fsp.readFile(target);
      const actual = crypto.createHash('sha256').update(buf).digest('hex');
      if (actual !== expected) {
        await fsp.unlink(target);
        throw new Error('OPA checksum mismatch');
      }
    }
    return target;
  } catch (err) {
    throw new Error(`Failed to download OPA: ${err.message}`);
  }
}

module.exports = { resolveOpa };
