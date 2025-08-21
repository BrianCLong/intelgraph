import React from 'react';
import { addSection, addCard, moveCard, selectCodex } from './codexSlice';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { DndContext, closestCenter } from '@dnd-kit/core';

export function CodexPanel() {
  const codex = useAppSelector(selectCodex);
  const dispatch = useAppDispatch();
  return (
    <aside aria-label="Codex" className="codex-panel">
      <header>
        <h2>Codex</h2>
        <button onClick={() => dispatch(addSection('New Section'))}>+ Section</button>
      </header>
      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={() => {
          /* dispatch moveCard */
        }}
      >
        {/* render sections & cards */}
      </DndContext>
    </aside>
  );
}
export default CodexPanel;
