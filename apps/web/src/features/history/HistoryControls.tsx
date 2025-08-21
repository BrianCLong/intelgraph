import React, { useEffect } from "react";
import $ from "jquery";
import { useAppDispatch, useAppSelector } from "../../store/hooks";

export default function HistoryControls(){
  const d = useAppDispatch();
  const hist = useAppSelector(s=>s.history);

  useEffect(()=>{
    const $root = $(document.body);
    const onKey = (e: KeyboardEvent) => {
      const z = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z";
      if (!z) return;
      if (e.shiftKey) d({ type:"history/redo" }); else d({ type:"history/undo" });
      $root.trigger("intelgraph:history:key", [{ redo: e.shiftKey }]);
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey as any);
    return ()=> window.removeEventListener("keydown", onKey as any);
  }, [d]);

  return (
    <div className="history-ctrls">
      <button data-test="btn-undo" onClick={()=>d({type:"history/undo"})} disabled={!hist.undo.length}>Undo</button>
      <button data-test="btn-redo" onClick={()=>d({type:"history/redo"})} disabled={!hist.redo.length}>Redo</button>
    </div>
  );
}
