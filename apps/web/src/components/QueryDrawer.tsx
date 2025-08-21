import React, { useState } from 'react'

export function QueryDrawer() {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [manual, setManual] = useState('')
  const [result, setResult] = useState<any>(null)
  const [sandbox, setSandbox] = useState<any>(null)
  const [citations, setCitations] = useState('')

  const toggle = () => setOpen(!open)

  async function generate() {
    const res = await fetch('/api/nlq/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    setResult(await res.json())
  }

  async function runSandbox() {
    if (!result?.cypher) return
    const res = await fetch('/api/nlq/executeSandbox', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cypher: result.cypher, reason: 'preview' }),
    })
    setSandbox(await res.json())
  }

  const diff =
    manual && result ? (manual === result.cypher ? 'matches' : 'differs') : ''
  const canPublish = citations.trim().length > 0

  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 bg-background border-l transition-transform duration-300 shadow-lg $ {
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button
        className="absolute left-0 top-2 -translate-x-full bg-muted px-2 py-1 text-sm"
        onClick={toggle}
      >
        {open ? 'Close' : 'Query'}
      </button>
      <div className="p-4 space-y-4 text-sm h-full overflow-y-auto">
        <div>
          <label className="block font-medium">Prompt</label>
          <textarea
            className="w-full border p-2"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
          />
          <button
            className="mt-2 px-2 py-1 bg-primary text-primary-foreground"
            onClick={generate}
          >
            Generate
          </button>
        </div>
        {result && (
          <div>
            <h3 className="font-medium">Cypher Preview</h3>
            <pre className="bg-muted p-2 whitespace-pre-wrap break-all">
              {result.cypher}
            </pre>
            <p className="text-xs">
              Rows: {result.estimatedRows} Cost: {result.estimatedCost}
            </p>
            <p className="text-xs mt-1">{result.explanation}</p>
          </div>
        )}
        {result && (
          <div>
            <label className="block font-medium">Manual Query</label>
            <textarea
              className="w-full border p-2"
              value={manual}
              onChange={e => setManual(e.target.value)}
            />
            {diff && (
              <p className="text-xs mt-1">
                Generated query {diff} from manual.
              </p>
            )}
          </div>
        )}
        {result && (
          <div>
            <button
              className="px-2 py-1 bg-green-600 text-white"
              onClick={runSandbox}
            >
              Run in Sandbox
            </button>
            {sandbox && (
              <pre className="bg-muted p-2 mt-2 text-xs whitespace-pre-wrap break-all">
                {JSON.stringify(sandbox, null, 2)}
              </pre>
            )}
          </div>
        )}
        {result && (
          <div>
            <label className="block font-medium">Citations</label>
            <input
              className="w-full border p-1"
              value={citations}
              onChange={e => setCitations(e.target.value)}
            />
            <button
              className="mt-2 px-2 py-1 bg-purple-600 text-white disabled:opacity-50"
              disabled={!canPublish}
            >
              Publish
            </button>
            {!canPublish && (
              <p className="text-destructive text-xs mt-1">
                Citations required to publish
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
