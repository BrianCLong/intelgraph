export interface Fact {
  subject: string
  predicate: string
  object: string
  asserted?: boolean
  explanation?: string
}

export interface Rule {
  name: string
  priority: number
  when: (facts: Fact[]) => Fact[]
}

export function runRules(baseFacts: Fact[], rules: Rule[]): Fact[] {
  const facts: Fact[] = [...baseFacts]
  for (const rule of rules.sort((a, b) => b.priority - a.priority)) {
    const newFacts = rule.when(facts)
    for (const f of newFacts) {
      if (!facts.some(existing => existing.subject === f.subject && existing.predicate === f.predicate && existing.object === f.object)) {
        facts.push({ ...f, asserted: false, explanation: rule.name })
      }
    }
  }
  return facts
}
