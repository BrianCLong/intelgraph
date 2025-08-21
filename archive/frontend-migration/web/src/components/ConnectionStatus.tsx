import React from 'react'
import { Wifi, WifiOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSocket } from '@/contexts/SocketContext'

interface ConnectionStatusProps {
  className?: string
}

export function ConnectionStatus({ className }: ConnectionStatusProps) {
  const { connected, socket } = useSocket()
  
  const getStatus = () => {
    if (!socket) return 'disconnected'
    if (connected) return 'connected'
    return 'connecting'
  }

  const status = getStatus()

  const statusConfig = {
    connected: {
      icon: Wifi,
      text: 'Live',
      className: 'bg-green-100 text-green-800 border-green-200',
      iconClassName: 'text-green-600',
    },
    connecting: {
      icon: Loader2,
      text: 'Connecting',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      iconClassName: 'text-yellow-600 animate-spin',
    },
    disconnected: {
      icon: WifiOff,
      text: 'Offline',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      iconClassName: 'text-gray-600',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1 border rounded-full text-sm font-medium',
        config.className,
        className
      )}
    >
      <Icon className={cn('h-3 w-3', config.iconClassName)} />
      <span>{config.text}</span>
    </div>
  )
}