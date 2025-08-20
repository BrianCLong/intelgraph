import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AdminPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Administration</h1>
      <EmptyState
        title="Admin page under construction"
        description="This will show administrative controls and user management"
        icon="plus"
      />
    </div>
  )
}