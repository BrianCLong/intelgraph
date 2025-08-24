'use client'

export default function PolicyBadge({ policy }: { policy: any }) {
  return <span className="px-2 py-1 bg-gray-200 rounded">{policy?.sensitivity}</span>
}
