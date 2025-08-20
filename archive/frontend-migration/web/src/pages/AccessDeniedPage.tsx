import React from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useNavigate } from 'react-router-dom'

export default function AccessDeniedPage() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <EmptyState
        title="Access Denied"
        description="You don't have permission to access this resource"
        icon="alert"
        action={{
          label: "Go Home",
          onClick: () => navigate('/')
        }}
      />
    </div>
  )
}