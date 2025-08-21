import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function HelpPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Help & Documentation</h1>
      <EmptyState
        title="Help page under construction"
        description="This will show documentation and support resources"
        icon="plus"
      />
    </div>
  )
}