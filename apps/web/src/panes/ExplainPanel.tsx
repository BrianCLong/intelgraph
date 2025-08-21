import React from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { selectExplainModel, close } from "../features/explain/explainSlice";

export default function ExplainPanel(){
  const d = useAppDispatch();
  const model = useAppSelector(selectExplainModel);
  return (
    <div style={{ padding:12 }}>
      <header className="flex items-center justify-between">
        <h3>Explain this view</h3>
        <button onClick={()=>d(close())} aria-label="Close Explain">×</button>
      </header>
      <section>
        <h4>Query</h4>
        <pre data-test="explain-query">{JSON.stringify(model.query, null, 2)}</pre>
      </section>
      <section>
        <h4>Policy rationale</h4>
        <ul>
          {model.policy.map(p=> <li key={p.id}><strong>{p.id}</strong> — {p.message} ({p.severity})</li>)}
        </ul>
      </section>
    </div>
  );
}
