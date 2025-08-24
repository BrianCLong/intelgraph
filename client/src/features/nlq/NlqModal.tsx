import { useState } from 'react';

interface CompileResponse {
  cypher: string;
  costEstimate: { nodes: number; edges: number; rows: number; safe: boolean };
}

export function NlqModal() {
  const [nl, setNl] = useState('');
  const [cypher, setCypher] = useState('');
  const [cost, setCost] = useState<CompileResponse['costEstimate'] | null>(null);

  const handleCompile = async () => {
    const res = await fetch('/nlq/compile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nl }),
    });
    const data: CompileResponse = await res.json();
    setCypher(data.cypher);
    setCost(data.costEstimate);
  };

  return (
    <div>
      <textarea aria-label="nl-input" value={nl} onChange={(e) => setNl(e.target.value)} />
      <button onClick={handleCompile}>Preview</button>
      {cypher && (
        <div>
          <pre aria-label="cypher-output">{cypher}</pre>
          {cost && (
            <p aria-label="cost-display">
              Nodes: {cost.nodes} Edges: {cost.edges} Rows: {cost.rows} Safe:{' '}
              {cost.safe ? 'yes' : 'no'}
            </p>
          )}
          <button>Run in Sandbox</button>
        </div>
      )}
    </div>
  );
}
