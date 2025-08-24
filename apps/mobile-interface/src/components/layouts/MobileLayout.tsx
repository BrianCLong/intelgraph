import { ReactNode, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  FolderIcon,
  ChartBarIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
  CogIcon,
  MapIcon,
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  FolderIcon as FolderIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  UserIcon as UserIconSolid,
} from '@heroicons/react/24/solid';
import { useAuth } from '@/hooks/useAuth';
import { useOffline } from '@/hooks/useOffline';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';

interface MobileLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showHeader?: boolean;
}

const navigationItems = [
  {
    name: 'Home',
    href: '/',
    icon: HomeIcon,
    iconSolid: HomeIconSolid,
  },
  {
    name: 'Search',
    href: '/search',
    icon: MagnifyingGlassIcon,
    iconSolid: MagnifyingGlassIconSolid,
  },
  {
    name: 'Cases',
    href: '/cases',
    icon: FolderIcon,
    iconSolid: FolderIconSolid,
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    iconSolid: ChartBarIconSolid,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UserIcon,
    iconSolid: UserIconSolid,
  },
];

export function MobileLayout({
  children,
  showBottomNav = true,
  showHeader = true,
}: MobileLayoutProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { isOffline } = useOffline();
  const [showSidebar, setShowSidebar] = useState(false);
  const [notificationCount, setNotificationCount] = useState(3);

  useEffect(() => {
    const handleRouteChange = () => {
      setShowSidebar(false);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
    };
  }, [router.events]);

  const sidebarVariants = {
    closed: {
      x: '-100%',
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
    open: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 40,
      },
    },
  };

  const overlayVariants = {
    closed: {
      opacity: 0,
      transition: {
        duration: 0.3,
      },
    },
    open: {
      opacity: 1,
      transition: {
        duration: 0.3,
      },
    },
  };

  return (
    <div className="min-h-screen bg-intel-50 dark:bg-intel-900">
      {/* Header */}
      {showHeader && (
        <header className="bg-white dark:bg-intel-800 border-b border-intel-200 dark:border-intel-700 sticky top-0 z-40">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="p-2 -ml-2 text-intel-600 dark:text-intel-400 hover:text-intel-900 dark:hover:text-white"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            <div className="flex items-center space-x-1">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-intel-900 dark:text-white">
                IntelGraph
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {isOffline && (
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse" />
              )}
              <button className="p-2 text-intel-600 dark:text-intel-400 hover:text-intel-900 dark:hover:text-white relative">
                <BellIcon className="w-6 h-6" />
                {notificationCount > 0 && (
                  <Badge
                    variant="danger"
                    size="sm"
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-xs"
                  >
                    {notificationCount}
                  </Badge>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              variants={overlayVariants}
              initial="closed"
              animate="open"
              exit="closed"
              onClick={() => setShowSidebar(false)}
            />

            {/* Sidebar Content */}
            <motion.div
              className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-intel-800 z-50 shadow-2xl overflow-y-auto"
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between p-4 border-b border-intel-200 dark:border-intel-700">
                <div className="flex items-center space-x-3">
                  <Avatar
                    src={user?.avatar}
                    alt={user?.name}
                    size="md"
                    fallback={user?.name?.charAt(0) || 'U'}
                  />
                  <div>
                    <p className="font-medium text-intel-900 dark:text-white">
                      {user?.name || 'Anonymous'}
                    </p>
                    <p className="text-sm text-intel-600 dark:text-intel-400">
                      {user?.role || 'Analyst'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 text-intel-600 dark:text-intel-400 hover:text-intel-900 dark:hover:text-white"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Navigation */}
              <nav className="p-4 space-y-2">
                {navigationItems.map((item) => {
                  const isActive = router.pathname === item.href;
                  const Icon = isActive ? item.iconSolid : item.icon;

                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors
                        ${
                          isActive
                            ? 'bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300'
                            : 'text-intel-700 dark:text-intel-300 hover:bg-intel-100 dark:hover:bg-intel-700'
                        }
                      `}
                    >
                      <Icon className="w-6 h-6 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                })}

                <div className="border-t border-intel-200 dark:border-intel-700 pt-4 mt-4">
                  <Link
                    href="/map"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-intel-700 dark:text-intel-300 hover:bg-intel-100 dark:hover:bg-intel-700 transition-colors"
                  >
                    <MapIcon className="w-6 h-6 flex-shrink-0" />
                    <span className="font-medium">Map View</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center space-x-3 px-4 py-3 rounded-xl text-intel-700 dark:text-intel-300 hover:bg-intel-100 dark:hover:bg-intel-700 transition-colors"
                  >
                    <CogIcon className="w-6 h-6 flex-shrink-0" />
                    <span className="font-medium">Settings</span>
                  </Link>
                </div>

                <div className="border-t border-intel-200 dark:border-intel-700 pt-4 mt-4">
                  <button
                    onClick={signOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-900/20 transition-colors"
                  >
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span className="font-medium">Sign Out</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={`
          flex-1 px-4 py-6
          ${showBottomNav ? 'pb-24' : ''}
        `}
      >
        {children}
      </main>

      {/* Bottom Navigation */}
      {showBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-intel-800 border-t border-intel-200 dark:border-intel-700 z-30">
          <div className="grid grid-cols-5 h-16">
            {navigationItems.map((item) => {
              const isActive = router.pathname === item.href;
              const Icon = isActive ? item.iconSolid : item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex flex-col items-center justify-center space-y-1 transition-colors relative
                    ${
                      isActive
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-intel-500 dark:text-intel-400'
                    }
                  `}
                >
                  {isActive && (
                    <motion.div
                      className="absolute top-0 left-1/2 w-12 h-1 bg-primary-600 dark:bg-primary-400 rounded-b-full"
                      layoutId="activeTab"
                      style={{ x: '-50%' }}
                    />
                  )}
                  <Icon className="w-6 h-6" />
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}