import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Search,
  AlertTriangle,
  FileText,
  BarChart3,
  Database,
  Brain,
  FileBarChart,
  Settings,
  HelpCircle,
  History,
  LogOut,
  Command,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip'
import { useAuth } from '@/contexts/AuthContext'
import { useSearch } from '@/contexts/SearchContext'
import { useRbac } from '@/hooks/useRbac'
import type { User } from '@/types'
import { cn } from '@/lib/utils'

interface NavigationProps {
  user: User | null
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string | number
  resource?: string
  action?: string
}

const navItems: NavItem[] = [
  { name: 'Explore', href: '/explore', icon: Search, resource: 'investigations', action: 'read' },
  { name: 'Alerts', href: '/alerts', icon: AlertTriangle, badge: 3, resource: 'alerts', action: 'read' },
  { name: 'Cases', href: '/cases', icon: FileText, resource: 'cases', action: 'read' },
  { name: 'Command Center', href: '/dashboards/command-center', icon: BarChart3, resource: 'dashboards', action: 'read' },
  { name: 'Supply Chain', href: '/dashboards/supply-chain', icon: BarChart3, resource: 'dashboards', action: 'read' },
  { name: 'Data Sources', href: '/data/sources', icon: Database, resource: 'data', action: 'read' },
  { name: 'Models', href: '/models', icon: Brain, resource: 'models', action: 'read' },
  { name: 'Reports', href: '/reports', icon: FileBarChart, resource: 'reports', action: 'read' },
  { name: 'Admin', href: '/admin', icon: Settings, resource: 'admin', action: 'read' },
]

const supportItems: NavItem[] = [
  { name: 'Help', href: '/help', icon: HelpCircle },
  { name: 'Changelog', href: '/changelog', icon: History },
]

export function Navigation({ user }: NavigationProps) {
  const location = useLocation()
  const { logout } = useAuth()
  const { openSearch } = useSearch()

  const NavItemComponent = ({ item }: { item: NavItem }) => {
    const { hasPermission } = useRbac(
      item.resource || '',
      item.action || '',
      { user, fallback: !item.resource }
    )

    if (item.resource && !hasPermission) {
      return null
    }

    const isActive = location.pathname === item.href || 
                     (item.href !== '/' && location.pathname.startsWith(item.href))

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <NavLink
            to={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
              isActive
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1">{item.name}</span>
            {item.badge && (
              <Badge variant="secondary" className="text-xs">
                {item.badge}
              </Badge>
            )}
          </NavLink>
        </TooltipTrigger>
        <TooltipContent side="right">
          {item.name}
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <nav className="w-64 border-r bg-muted/50 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">IG</span>
          </div>
          <div className="font-semibold text-lg">IntelGraph</div>
        </NavLink>
      </div>

      {/* Search Button */}
      <div className="p-4 border-b">
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={openSearch}
        >
          <Command className="h-4 w-4 mr-2" />
          Search...
          <kbd className="ml-auto text-xs">⌘K</kbd>
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 p-4 space-y-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
          Intelligence
        </div>
        {navItems.slice(0, 3).map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 mt-6">
          Dashboards
        </div>
        {navItems.slice(3, 5).map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 mt-6">
          Platform
        </div>
        {navItems.slice(5).map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}
      </div>

      {/* Support & User */}
      <div className="p-4 border-t space-y-2">
        {supportItems.map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}
        
        {/* User Profile & Logout */}
        <div className="pt-4 space-y-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user?.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {user?.role}
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={logout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    </nav>
  )
}