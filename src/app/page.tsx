'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import ClothingCard from '@/components/ClothingCard';
import EditItemModal from '@/components/EditItemModal';
import UsageWarning from '@/components/UsageWarning';
import { fetchWardrobe } from '@/lib/api/client';
import type { ClothingItem } from '@/types';

export default function WardrobePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<ClothingItem | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWardrobe();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleEdit = useCallback((item: ClothingItem) => {
    setEditingItem(item);
  }, []);

  const handleSaveEdit = useCallback((updated: ClothingItem) => {
    setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    setEditingItem(null);
  }, []);

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Wardrobe</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          )}
        </div>
        <Link
          href="/upload"
          className="bg-indigo-600 text-white rounded-full px-4 py-2 text-sm font-semibold hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add
        </Link>
      </div>

      <UsageWarning />

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
              <div className="aspect-square bg-gray-200" />
              <div className="p-2 space-y-2">
                <div className="h-4 bg-gray-200 rounded-full w-16" />
                <div className="flex gap-1">
                  <div className="w-4 h-4 rounded-full bg-gray-200" />
                  <div className="w-4 h-4 rounded-full bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-500 font-medium">{error}</p>
          <button
            onClick={fetchItems}
            className="mt-4 text-indigo-600 text-sm font-semibold hover:underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && items.length === 0 && (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-indigo-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859M12 3v8.25m0 0l-3-3m3 3l3-3" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Your wardrobe is empty</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">
            Upload your first clothing item and let AI analyze it for you.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-full px-6 py-3 font-semibold hover:bg-indigo-700 active:scale-95 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Upload your first item
          </Link>
        </div>
      )}

      {/* Grid */}
      {!loading && !error && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(item => (
            <ClothingCard key={item.id} item={item} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
        </div>
      )}
      {editingItem && (
        <EditItemModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={handleSaveEdit}
          onDelete={(id) => { handleDelete(id); setEditingItem(null); }}
        />
      )}
    </div>
  );
}
