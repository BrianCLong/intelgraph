import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function DataSourcesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Data Sources</h1>
      <EmptyState
        title="Data sources page under construction"
        description="This will show data source integrations and management"
        icon="plus"
      />
    </div>
  )
}