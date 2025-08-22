import { useState } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EllipsisVerticalIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { MobileLayout } from '@/components/layouts/MobileLayout';
import { SearchBar } from '@/components/SearchBar';
import { FilterPanel } from '@/components/FilterPanel';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/Badge';
import { Avatar } from '@/components/Avatar';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useOffline } from '@/hooks/useOffline';
import { formatDistanceToNow } from 'date-fns';

interface Case {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
  updatedAt: string;
  entityCount: number;
  tags: string[];
}

const CasesPage: NextPage = () => {
  const { user } = useAuth();
  const { isOffline } = useOffline();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    assignee: [] as string[],
  });

  const { data: cases = [], isLoading, error } = useQuery({
    queryKey: ['cases', searchQuery, filters],
    queryFn: () => apiClient.getCases({ search: searchQuery, ...filters }),
    enabled: !!user && !isOffline,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const filteredCases = cases.filter((case_: Case) =>
    case_.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    case_.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending': return 'warning';
      case 'resolved': return 'primary';
      case 'closed': return 'intel';
      default: return 'intel';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      case 'low': return 'intel';
      default: return 'intel';
    }
  };

  if (isLoading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <>
      <Head>
        <title>Cases - IntelGraph Mobile</title>
        <meta name="description" content="Manage investigation cases" />
      </Head>

      <MobileLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-intel-900 dark:text-white">Cases</h1>
              <p className="text-intel-600 dark:text-intel-400 mt-1">
                {filteredCases.length} of {cases.length} cases
              </p>
            </div>
            
            <Link
              href="/cases/new"
              className="bg-primary-600 hover:bg-primary-700 text-white p-3 rounded-xl transition-colors shadow-lg"
            >
              <PlusIcon className="w-6 h-6" />
            </Link>
          </div>

          {/* Search and Filter */}
          <div className="space-y-4">
            <SearchBar
              placeholder="Search cases..."
              onSearch={setSearchQuery}
              showVoiceSearch
            />
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-xl border transition-colors
                  ${showFilters
                    ? 'bg-primary-100 dark:bg-primary-900/50 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                    : 'bg-white dark:bg-intel-800 border-intel-200 dark:border-intel-700 text-intel-700 dark:text-intel-300'
                  }
                `}
              >
                <FunnelIcon className="w-5 h-5" />
                <span className="text-sm font-medium">Filters</span>
                {(filters.status.length + filters.priority.length + filters.assignee.length) > 0 && (
                  <Badge variant="primary" size="sm">
                    {filters.status.length + filters.priority.length + filters.assignee.length}
                  </Badge>
                )}
              </button>
            </div>

            {/* Filter Panel */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white dark:bg-intel-800 rounded-xl p-4 border border-intel-200 dark:border-intel-700"
              >
                <FilterPanel
                  filters={[
                    {
                      key: 'status',
                      label: 'Status',
                      options: [
                        { value: 'active', label: 'Active' },
                        { value: 'pending', label: 'Pending' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'closed', label: 'Closed' },
                      ],
                      selected: filters.status,
                    },
                    {
                      key: 'priority',
                      label: 'Priority',
                      options: [
                        { value: 'critical', label: 'Critical' },
                        { value: 'high', label: 'High' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'low', label: 'Low' },
                      ],
                      selected: filters.priority,
                    },
                  ]}
                  onChange={(key, values) => {
                    setFilters(prev => ({ ...prev, [key]: values }));
                  }}
                  onClear={() => {
                    setFilters({ status: [], priority: [], assignee: [] });
                  }}
                />
              </motion.div>
            )}
          </div>

          {/* Cases List */}
          {filteredCases.length === 0 ? (
            <EmptyState
              icon={FolderIcon}
              title="No cases found"
              description={searchQuery ? "Try adjusting your search or filters" : "Create your first case to get started"}
              action={
                <Link
                  href="/cases/new"
                  className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Create Case
                </Link>
              }
            />
          ) : (
            <div className="space-y-4">
              {filteredCases.map((case_, index) => (
                <motion.div
                  key={case_.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Link href={`/cases/${case_.id}`}>
                    <div className="bg-white dark:bg-intel-800 rounded-xl p-4 border border-intel-200 dark:border-intel-700 hover:border-primary-300 dark:hover:border-primary-700 transition-colors">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-intel-900 dark:text-white truncate">
                            {case_.title}
                          </h3>
                          <p className="text-sm text-intel-600 dark:text-intel-400 mt-1 line-clamp-2">
                            {case_.description}
                          </p>
                        </div>
                        
                        <button className="p-2 -mr-2 text-intel-400 hover:text-intel-600 dark:hover:text-intel-300 transition-colors">
                          <EllipsisVerticalIcon className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Status and Priority */}
                      <div className="flex items-center space-x-2 mb-3">
                        <Badge variant={getStatusColor(case_.status) as any} size="sm">
                          {case_.status}
                        </Badge>
                        <Badge variant={getPriorityColor(case_.priority) as any} size="sm">
                          {case_.priority}
                        </Badge>
                        {case_.entityCount > 0 && (
                          <span className="text-xs text-intel-500 dark:text-intel-400">
                            {case_.entityCount} entities
                          </span>
                        )}
                      </div>

                      {/* Tags */}
                      {case_.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {case_.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-1 text-xs bg-intel-100 dark:bg-intel-700 text-intel-700 dark:text-intel-300 rounded-md"
                            >
                              {tag}
                            </span>
                          ))}
                          {case_.tags.length > 3 && (
                            <span className="inline-block px-2 py-1 text-xs bg-intel-100 dark:bg-intel-700 text-intel-500 dark:text-intel-400 rounded-md">
                              +{case_.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Footer */}
                      <div className="flex items-center justify-between text-sm text-intel-500 dark:text-intel-400">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-1">
                            <Avatar
                              src={case_.assignee.avatar}
                              alt={case_.assignee.name}
                              size="sm"
                              fallback={case_.assignee.name.charAt(0)}
                            />
                            <span>{case_.assignee.name}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-4 h-4" />
                          <span>
                            {formatDistanceToNow(new Date(case_.updatedAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Offline Indicator */}
          {isOffline && (
            <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-4 text-center">
              <p className="text-warning-800 dark:text-warning-200 font-medium">
                Showing cached cases
              </p>
              <p className="text-warning-600 dark:text-warning-400 text-sm mt-1">
                Data will refresh when connection is restored
              </p>
            </div>
          )}
        </div>
      </MobileLayout>
    </>
  );
};

export default CasesPage;