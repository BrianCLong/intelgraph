import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function CasesPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Cases</h1>
      <EmptyState
        title="Cases page under construction"
        description="This page will show case management with investigation tracking"
        icon="file"
      />
    </div>
  )
}