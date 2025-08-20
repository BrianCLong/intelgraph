import React from 'react'
import { useParams } from 'react-router-dom'
import { EmptyState } from '@/components/ui/EmptyState'

export default function AlertDetailPage() {
  const { id } = useParams()
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Alert Details: {id}</h1>
      <EmptyState
        title="Alert detail page under construction"
        description="This page will show detailed information about a specific alert"
        icon="alert"
      />
    </div>
  )
}