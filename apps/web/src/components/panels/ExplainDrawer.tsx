import * as React from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/Drawer'
import { Badge } from '@/components/ui/Badge'
import { gql, useQuery } from '@apollo/client'
import ethics from '../../../../../graph-xai/docs/ETHICS.md?raw'

const EXPLAIN_QUERY = gql`
  query ExplainConnection($sourceId: ID!, $targetId: ID!) {
    explainConnection(sourceId: $sourceId, targetId: $targetId) {
      traceId
      paths { nodes edges }
      featureAttributions { feature importance }
      fairnessFlags
      limitations
    }
  }
`

interface ExplainDrawerProps {
  sourceId: string
  targetId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExplainDrawer({ sourceId, targetId, open, onOpenChange }: ExplainDrawerProps) {
  const { data, loading } = useQuery(EXPLAIN_QUERY, { variables: { sourceId, targetId }, skip: !open })
  const explanation = data?.explainConnection

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent side="right" className="w-96 p-4 space-y-4">
        <DrawerHeader>
          <DrawerTitle>Explanation</DrawerTitle>
        </DrawerHeader>
        {loading && <div>Loading…</div>}
        {explanation && (
          <div className="space-y-3 overflow-y-auto">
            <div>
              <h4 className="font-medium">Top Paths</h4>
              {explanation.paths.map((p: any, i: number) => (
                <div key={i} className="text-sm mt-1">
                  {p.nodes.join(' → ')}
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium">Feature Attribution</h4>
              {explanation.featureAttributions.map((f: any) => (
                <div key={f.feature} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{f.feature}</span>
                  <Badge variant="secondary">{(f.importance * 100).toFixed(1)}%</Badge>
                </div>
              ))}
            </div>
            {explanation.fairnessFlags?.length > 0 && (
              <div>
                <h4 className="font-medium">Fairness</h4>
                {explanation.fairnessFlags.map((f: string) => (
                  <Badge key={f} variant="destructive" className="mr-1">{f}</Badge>
                ))}
              </div>
            )}
            {explanation.limitations?.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {explanation.limitations.join(' ')}
              </div>
            )}
            <div className="text-xs text-muted-foreground whitespace-pre-wrap">{ethics}</div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
