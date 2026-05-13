'use client';

import { useEffect, useState } from 'react';
import { fetchUsage } from '@/lib/api/client';
import type { UsageStats } from '@/types';

export default function UsageWarning() {
  const [usage, setUsage] = useState<UsageStats | null>(null);

  useEffect(() => {
    fetchUsage()
      .then(setUsage)
      .catch(() => {});
  }, []);

  if (!usage) return null;

  const showBlobWarning = usage.percentUsed > 80;
  const showItemWarning = usage.itemCount >= usage.maxItems * 0.9;

  if (!showBlobWarning && !showItemWarning) return null;

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex gap-2 items-start">
      <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.999-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z"
          clipRule="evenodd"
        />
      </svg>
      <div>
        <p className="text-sm font-semibold text-amber-800">Storage nearing limit</p>
        {showBlobWarning && (
          <p className="text-xs text-amber-700 mt-0.5">
            Blob storage: {formatBytes(usage.blobUsageBytes)} / {formatBytes(usage.maxBlobBytes)} ({usage.percentUsed}% used)
          </p>
        )}
        {showItemWarning && (
          <p className="text-xs text-amber-700 mt-0.5">
            Items: {usage.itemCount} / {usage.maxItems}. Consider removing unused clothing.
          </p>
        )}
      </div>
    </div>
  );
}
