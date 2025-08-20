import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ReportsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Reports</h1>
      <EmptyState
        title="Reports page under construction"
        description="This will show report generation and analytics"
        icon="plus"
      />
    </div>
  )
}