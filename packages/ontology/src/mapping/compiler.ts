export type MappingFunc = (src: any) => any

export function compile(mappingYaml: string): MappingFunc {
  const spec: Record<string, string> = {}
  for (const line of mappingYaml.split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(.+)$/)
    if (m) spec[m[1]] = m[2].trim()
  }
  return (src: any) => {
    const out: any = {}
    for (const [k, expr] of Object.entries(spec)) {
      out[k] = expr.split('.').reduce((o, p) => (o as any)?.[p], src)
    }
    return out
  }
}
