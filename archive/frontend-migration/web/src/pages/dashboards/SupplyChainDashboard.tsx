import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function SupplyChainDashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Supply Chain Dashboard</h1>
      <EmptyState
        title="Supply Chain dashboard under construction"
        description="This will show supply chain risk analysis and monitoring"
        icon="plus"
      />
    </div>
  )
}