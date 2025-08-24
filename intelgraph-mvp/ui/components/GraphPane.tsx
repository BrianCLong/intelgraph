'use client'

export default function GraphPane({ data }: { data: any }) {
  return <div className="p-2 border">Graph Pane ({data?.nodes?.length || 0} nodes)</div>
}
