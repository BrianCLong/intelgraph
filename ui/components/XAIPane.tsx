import React from "react";

interface Props {
  data?: {
    importances: { id: string; type: string; score: number }[];
    paths: { path: string[]; rationale: string }[];
    fairness: { parity?: Record<string, number> };
  } | null;
}

export default function XAIPane({ data }: Props) {
  if (!data) {
    return (
      <div className="xai-pane">
        <h3>XAI Explanations</h3>
        <p>No explanation loaded.</p>
      </div>
    );
  }

  const nodes = data.importances.filter((i) => i.type === "node");

  return (
    <div className="xai-pane">
      <h3>XAI Explanations</h3>
      <section>
        <h4>Nodes</h4>
        <ul>
          {nodes.map((n) => (
            <li key={n.id}>
              {n.id}: {n.score.toFixed(2)}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h4>Top Paths</h4>
        <ul>
          {data.paths.map((p, idx) => (
            <li key={idx}>
              {p.path.join(" → ")} – {p.rationale}
            </li>
          ))}
        </ul>
      </section>
      {data.fairness.parity && (
        <section>
          <h4>Fairness Δ</h4>
          <ul>
            {Object.entries(data.fairness.parity).map(([g, v]) => (
              <li key={g}>
                {g}: {v.toFixed(2)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

