import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'

export default function ChangelogPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Changelog</h1>
      <EmptyState
        title="Changelog page under construction"
        description="This will show platform updates and release notes"
        icon="plus"
      />
    </div>
  )
}