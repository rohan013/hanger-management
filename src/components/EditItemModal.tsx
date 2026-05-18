'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { updateClothing, deleteClothing } from '@/lib/api/client';
import type { ClothingItem } from '@/types';

const CATEGORIES = [
  'tops', 'bottoms', 'dresses', 'outerwear', 'shoes',
  'accessories', 'activewear', 'formal', 'underwear', 'other',
] as const;

type ColorPair = { hex: string; name: string };

interface EditItemModalProps {
  item: ClothingItem;
  onClose: () => void;
  onSave: (updated: ClothingItem) => void;
  onDelete?: (id: string) => void;
}

export default function EditItemModal({ item, onClose, onSave, onDelete }: EditItemModalProps) {
  const [category, setCategory] = useState(item.category);
  const [colorPairs, setColorPairs] = useState<ColorPair[]>(
    item.colors.map((hex, i) => ({ hex, name: item.color_names[i] ?? '' }))
  );
  const [description, setDescription] = useState(item.description ?? '');
  const [tags, setTags] = useState<string[]>(item.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateClothing(item.id, {
        category,
        colors: colorPairs.map(p => p.hex),
        color_names: colorPairs.map(p => p.name),
        description: description.trim() || null,
        tags,
      });
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  const handleTagKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const newTag = tagInput.trim().replace(/,$/, '');
      if (!tags.includes(newTag)) setTags(prev => [...prev, newTag]);
      setTagInput('');
    }
  }, [tagInput, tags]);

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteClothing(item.id);
      onDelete?.(item.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const addColorPair = () => setColorPairs(prev => [...prev, { hex: '#000000', name: '' }]);
  const removeColorPair = (i: number) => setColorPairs(prev => prev.filter((_, idx) => idx !== i));
  const updateColorPair = (i: number, field: 'hex' | 'name', value: string) =>
    setColorPairs(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p));

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50"
      onClick={onClose}
    >
      <div
        className="fixed bottom-0 left-0 right-0 max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 pb-8">
          {/* Drag handle */}
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />

          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">Edit Item</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 text-xl font-bold"
            >
              ×
            </button>
          </div>

          {/* Thumbnail + category */}
          <div className="flex gap-3 mb-5">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
              <Image
                src={item.image_url}
                alt={item.description || item.category}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white capitalize focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Colors */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-500">Colors</label>
              <button
                onClick={addColorPair}
                className="text-xs text-indigo-600 font-semibold hover:text-indigo-800"
              >
                + Add
              </button>
            </div>
            <div className="space-y-2">
              {colorPairs.map((pair, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={pair.hex}
                    onChange={e => updateColorPair(i, 'hex', e.target.value)}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5 flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={pair.name}
                    placeholder="Color name"
                    onChange={e => updateColorPair(i, 'name', e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() => removeColorPair(i)}
                    className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-red-500 text-xl font-bold flex-shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
              {colorPairs.length === 0 && (
                <p className="text-xs text-gray-400 italic">No colors — tap + Add to add one.</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe this item…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tags */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-medium px-2.5 py-1 rounded-full"
                >
                  {tag}
                  <button
                    onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                    className="text-indigo-400 hover:text-indigo-700 font-bold leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Add tag, press Enter or comma"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm mb-3">{error}</p>
          )}

          {/* Actions */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white rounded-2xl py-4 font-semibold hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <button
            onClick={onClose}
            disabled={saving || deleting}
            className="w-full bg-gray-100 text-gray-600 rounded-2xl py-3.5 font-semibold text-sm mt-2 hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-60"
          >
            Cancel
          </button>

          {/* Delete */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={saving || deleting}
              className="w-full text-red-500 rounded-2xl py-3 font-semibold text-sm mt-1 hover:bg-red-50 active:scale-95 transition-all disabled:opacity-60"
            >
              Delete Item
            </button>
          ) : (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-700 font-medium text-center mb-3">Delete this item permanently?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  className="flex-1 bg-white border border-gray-200 text-gray-600 rounded-xl py-2.5 font-semibold text-sm hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 text-white rounded-xl py-2.5 font-semibold text-sm hover:bg-red-600 active:scale-95 transition-all disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
