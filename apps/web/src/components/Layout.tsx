import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Navigation } from './Navigation'
import { GlobalSearch } from './GlobalSearch'
import { QueryDrawer } from './QueryDrawer'
import { useAuth } from '@/contexts/AuthContext'
import { Skeleton } from '@/components/ui/Skeleton'

export function Layout() {
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="h-screen flex">
        <div className="w-64 bg-muted">
          <Skeleton className="h-full" />
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar Navigation */}
      <Navigation user={user} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-6">
            <div className="flex-1">
              <h1 className="text-lg font-semibold">IntelGraph Platform</h1>
            </div>
            
            {/* Search trigger - actual search modal is rendered globally */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Welcome back, {user?.name}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* Global Search Modal */}
      <GlobalSearch />
      <QueryDrawer />
    </div>
  )
}