import { useState, useEffect } from 'react'
import type { User, Permission } from '@/types'

interface UseRbacOptions {
  user?: User | null
  fallback?: boolean
}

export function useRbac(
  resource: string,
  action: string,
  options: UseRbacOptions = {}
) {
  const { user, fallback = false } = options
  const [hasPermission, setHasPermission] = useState(fallback)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setHasPermission(fallback)
      setLoading(false)
      return
    }

    // Check user permissions
    const permission = user.permissions.find(
      (p: Permission) => p.resource === resource && p.action === action
    )

    if (permission) {
      setHasPermission(permission.effect === 'allow')
    } else {
      // Check role-based permissions
      const rolePermissions = getRolePermissions(user.role)
      const rolePermission = rolePermissions.find(
        (p: Permission) => p.resource === resource && p.action === action
      )
      setHasPermission(rolePermission?.effect === 'allow' || fallback)
    }

    setLoading(false)
  }, [user, resource, action, fallback])

  return { hasPermission, loading }
}

function getRolePermissions(role: string): Permission[] {
  const rolePermissions: Record<string, Permission[]> = {
    admin: [
      { resource: '*', action: '*', effect: 'allow' },
    ],
    analyst: [
      { resource: 'investigations', action: 'read', effect: 'allow' },
      { resource: 'investigations', action: 'write', effect: 'allow' },
      { resource: 'entities', action: 'read', effect: 'allow' },
      { resource: 'entities', action: 'write', effect: 'allow' },
      { resource: 'alerts', action: 'read', effect: 'allow' },
      { resource: 'alerts', action: 'write', effect: 'allow' },
      { resource: 'cases', action: 'read', effect: 'allow' },
      { resource: 'dashboards', action: 'read', effect: 'allow' },
    ],
    investigator: [
      { resource: 'investigations', action: 'read', effect: 'allow' },
      { resource: 'investigations', action: 'write', effect: 'allow' },
      { resource: 'entities', action: 'read', effect: 'allow' },
      { resource: 'cases', action: 'read', effect: 'allow' },
      { resource: 'cases', action: 'write', effect: 'allow' },
      { resource: 'dashboards', action: 'read', effect: 'allow' },
    ],
    viewer: [
      { resource: 'investigations', action: 'read', effect: 'allow' },
      { resource: 'entities', action: 'read', effect: 'allow' },
      { resource: 'alerts', action: 'read', effect: 'allow' },
      { resource: 'cases', action: 'read', effect: 'allow' },
      { resource: 'dashboards', action: 'read', effect: 'allow' },
    ],
  }

  return rolePermissions[role] || []
}

// Hook for checking multiple permissions
export function useRbacMultiple(
  permissions: Array<{ resource: string; action: string }>,
  options: UseRbacOptions = {}
) {
  const results = permissions.map(({ resource, action }) =>
    useRbac(resource, action, options)
  )

  const loading = results.some(result => result.loading)
  const hasAllPermissions = results.every(result => result.hasPermission)
  const hasAnyPermission = results.some(result => result.hasPermission)

  return {
    loading,
    hasAllPermissions,
    hasAnyPermission,
    permissions: results.map((result, index) => ({
      ...permissions[index],
      hasPermission: result.hasPermission,
    })),
  }
}