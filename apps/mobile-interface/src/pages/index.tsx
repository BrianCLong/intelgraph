import { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { SearchBar } from '@/components/SearchBar';
import { QuickActions } from '@/components/QuickActions';
import { RecentActivity } from '@/components/RecentActivity';
import { AlertsPanel } from '@/components/AlertsPanel';
import { WeatherWidget } from '@/components/WeatherWidget';
import { StatusIndicator } from '@/components/StatusIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useOffline } from '@/hooks/useOffline';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { motion } from 'framer-motion';

const HomePage: NextPage = () => {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: () => apiClient.getDashboardData(),
    enabled: !!user && !isOffline,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
      },
    },
  };

  return (
    <>
      <Head>
        <title>IntelGraph Mobile - Intelligence Dashboard</title>
        <meta name="description" content="Mobile intelligence analysis platform" />
      </Head>

      <MobileLayout>
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="bg-white dark:bg-intel-800 rounded-xl p-6 shadow-soft">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-intel-900 dark:text-white">
                  {greeting}, {user?.firstName || 'Analyst'}
                </h1>
                <p className="text-intel-600 dark:text-intel-400 mt-1">
                  {new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <StatusIndicator
                  status={isOffline ? 'offline' : 'online'}
                  label={isOffline ? 'Offline' : 'Online'}
                />
                <WeatherWidget />
              </div>
            </div>

            {/* Search Bar */}
            <SearchBar
              placeholder="Search entities, cases, or intelligence..."
              onSearch={(query) => console.log('Search:', query)}
              showVoiceSearch
              showQRScanner
            />
          </motion.div>

          {/* Alerts Panel */}
          <motion.div variants={itemVariants}>
            <AlertsPanel
              alerts={dashboardData?.alerts || []}
              isLoading={isLoading}
            />
          </motion.div>

          {/* Quick Actions */}
          <motion.div variants={itemVariants}>
            <QuickActions
              actions={[
                {
                  id: 'new-case',
                  title: 'New Case',
                  description: 'Create a new investigation case',
                  icon: 'FolderPlusIcon',
                  color: 'primary',
                  href: '/cases/new',
                },
                {
                  id: 'scan-document',
                  title: 'Scan Document',
                  description: 'OCR and analyze documents',
                  icon: 'DocumentScannerIcon',
                  color: 'success',
                  action: 'scan',
                },
                {
                  id: 'voice-note',
                  title: 'Voice Note',
                  description: 'Record voice observations',
                  icon: 'MicrophoneIcon',
                  color: 'warning',
                  action: 'record',
                },
                {
                  id: 'geolocation',
                  title: 'Mark Location',
                  description: 'Tag current location',
                  icon: 'MapPinIcon',
                  color: 'intel',
                  action: 'location',
                },
                {
                  id: 'emergency',
                  title: 'Emergency',
                  description: 'Quick emergency protocols',
                  icon: 'ExclamationTriangleIcon',
                  color: 'danger',
                  action: 'emergency',
                },
                {
                  id: 'sync',
                  title: 'Sync Data',
                  description: 'Synchronize offline data',
                  icon: 'ArrowPathIcon',
                  color: 'primary',
                  action: 'sync',
                  disabled: !isOffline,
                },
              ]}
            />
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <RecentActivity
              activities={dashboardData?.recentActivity || []}
              isLoading={isLoading}
            />
          </motion.div>

          {/* Statistics Grid */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.activeCases || '0'}
              </div>
              <div className="text-primary-100 text-sm">Active Cases</div>
            </div>
            <div className="bg-gradient-to-r from-success-500 to-success-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.resolvedCases || '0'}
              </div>
              <div className="text-success-100 text-sm">Resolved Cases</div>
            </div>
            <div className="bg-gradient-to-r from-warning-500 to-warning-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.pendingAlerts || '0'}
              </div>
              <div className="text-warning-100 text-sm">Pending Alerts</div>
            </div>
            <div className="bg-gradient-to-r from-intel-500 to-intel-600 rounded-xl p-4 text-white">
              <div className="text-2xl font-bold">
                {dashboardData?.stats?.totalEntities || '0'}
              </div>
              <div className="text-intel-100 text-sm">Total Entities</div>
            </div>
          </motion.div>

          {/* Offline Indicator */}
          {isOffline && (
            <motion.div
              variants={itemVariants}
              className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-4"
            >
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-warning-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-warning-800 dark:text-warning-200 font-medium">
                    Working Offline
                  </p>
                  <p className="text-warning-600 dark:text-warning-400 text-sm">
                    Your data will sync when connection is restored
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </MobileLayout>
    </>
  );
};

export default HomePage;