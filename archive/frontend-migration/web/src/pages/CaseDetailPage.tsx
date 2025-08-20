import React from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'

export default function CaseDetailPage() {
  const { id } = useParams()
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Case Details: {id}</h1>
      <EmptyState
        title="Case detail page under construction"
        description="This page will show detailed case information and management tools"
        icon="file"
      />
    </div>
  )
}