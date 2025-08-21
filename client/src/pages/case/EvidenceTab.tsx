import { useState } from 'react';

export default function EvidenceTab() {
  const [hash, setHash] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    setHash(hex);
  }

  return (
    <div>
      <input type="file" onChange={handleFile} />
      {hash && <p>SHA-256: {hash}</p>}
    </div>
  );
}
