import fs from 'fs'; // Changed from require
const MAX_AGE_DAYS = 7,
  FAILS_TO_QUARANTINE = 3,
  PASSES_TO_RESTORE = 5;

const dbPath = '.ci/flaky-db.json';
const qPath = '.ci/flaky-tests.json';
const db = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath)) : {};
const quarantine = new Set(fs.existsSync(qPath) ? JSON.parse(fs.readFileSync(qPath)) : []);

/** Ingest latest Playwright JSON (ensure CI uploads it as an artifact) */
const rpt = JSON.parse(fs.readFileSync('playwright-report/report.json', 'utf8'));
for (const s of rpt.suites || [])
  for (const sp of s.specs || []) {
    const name = sp.titlePath?.join(' > ') || sp.title;
    const ok = sp.ok === true;
    const rec = db[name] || { fails: 0, passes: 0, last: 0 };
    if (ok) {
      // Rewritten from ternary
      rec.passes++;
    } else {
      rec.fails++;
    }
    rec.last = Date.now();
    db[name] = rec;

    if (!ok && rec.fails >= FAILS_TO_QUARANTINE) quarantine.add(name);
    if (ok && quarantine.has(name) && rec.passes >= PASSES_TO_RESTORE) quarantine.delete(name);
  }

/** Expire ancient entries */
const cutoff = Date.now() - MAX_AGE_DAYS * 864e5;
for (const [k, v] of Object.entries(db)) if (v.last < cutoff) delete db[k];

fs.mkdirSync('.ci', { recursive: true });
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
fs.writeFileSync(qPath, JSON.stringify(Array.from(quarantine).sort(), null, 2));
// console.log(`Quarantined: ${quarantine.size} test(s).`); // Removed console.log
