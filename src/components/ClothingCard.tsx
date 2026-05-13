'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { deleteClothing } from '@/lib/api/client';
import type { ClothingItem } from '@/types';

interface ClothingCardProps {
  item: ClothingItem;
  onDelete?: (id: string) => void;
}

export default function ClothingCard({ item, onDelete }: ClothingCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLongPressStart = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowDelete(true);
    }, 500);
  }, []);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  }, []);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);

    try {
      await deleteClothing(item.id);
      onDelete?.(item.id);
    } catch {
      alert('Failed to delete item. Please try again.');
      setDeleting(false);
      setShowDelete(false);
    }
  };

  const categoryColors: Record<string, string> = {
    tops: 'bg-blue-100 text-blue-700',
    bottoms: 'bg-green-100 text-green-700',
    dresses: 'bg-pink-100 text-pink-700',
    outerwear: 'bg-gray-100 text-gray-700',
    shoes: 'bg-amber-100 text-amber-700',
    accessories: 'bg-purple-100 text-purple-700',
    activewear: 'bg-orange-100 text-orange-700',
    formal: 'bg-slate-100 text-slate-700',
    underwear: 'bg-rose-100 text-rose-700',
    other: 'bg-neutral-100 text-neutral-700',
  };

  const badgeClass = categoryColors[item.category] || 'bg-neutral-100 text-neutral-700';

  return (
    <div
      className="relative bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer select-none"
      onMouseDown={handleLongPressStart}
      onMouseUp={handleLongPressEnd}
      onMouseLeave={handleLongPressEnd}
      onTouchStart={handleLongPressStart}
      onTouchEnd={handleLongPressEnd}
      onClick={() => setShowDelete(prev => !prev)}
    >
      {/* Image */}
      <div className="relative aspect-square bg-gray-50">
        <Image
          src={item.image_url}
          alt={item.description || item.category}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
        />
      </div>

      {/* Info */}
      <div className="p-2">
        {/* Category badge */}
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full capitalize ${badgeClass}`}>
          {item.category}
        </span>

        {/* Color swatches */}
        {item.colors && item.colors.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {item.colors.slice(0, 5).map((color, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border border-gray-200 flex-shrink-0"
                style={{ backgroundColor: color }}
                title={item.color_names?.[i] || color}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete overlay */}
      {showDelete && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-2xl">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-500 text-white rounded-full px-4 py-2 text-sm font-semibold shadow-lg hover:bg-red-600 active:scale-95 transition-all disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
          <button
            onClick={e => { e.stopPropagation(); setShowDelete(false); }}
            className="absolute top-2 right-2 bg-white text-gray-600 rounded-full w-7 h-7 flex items-center justify-center text-lg font-bold shadow"
          >
            ×
          </button>
        </div>
      )}

      {/* Quick delete X button (always visible on hover via desktop) */}
      {!showDelete && onDelete && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white/80 backdrop-blur-sm text-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold shadow hover:bg-red-500 hover:text-white transition-all"
          aria-label="Delete item"
        >
          ×
        </button>
      )}
    </div>
  );
}
