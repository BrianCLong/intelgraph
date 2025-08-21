# Undo/Redo and Explain Panel Demo

This demo showcases the global undo/redo stack and the explain-this-view panel. Use **Ctrl/⌘+Z** to undo and **Ctrl/⌘+Shift+Z** to redo recent actions. The toolbar exposes buttons for the same operations.

The Explain panel reveals the query and policy rationale for the current view. It updates as history is traversed and can be opened via the jQuery event `intelgraph:explain:open`.

```bash
npm run dev
# navigate to /case/CASE-1
```
