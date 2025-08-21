import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ModelsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">ML Models</h1>
      <EmptyState
        title="Models page under construction"
        description="This will show AI/ML model management and monitoring"
        icon="plus"
      />
    </div>
  )
}