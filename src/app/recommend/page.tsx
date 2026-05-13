'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ColorWheel from '@/components/ColorWheel';
import { fetchRecommendation, regenerateRecommendation } from '@/lib/api/client';
import type { RecommendationWithItems } from '@/types';

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-2 space-y-2">
        <div className="h-4 bg-gray-200 rounded-full w-16" />
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded-full bg-gray-200" />
          <div className="w-4 h-4 rounded-full bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

export default function RecommendPage() {
  const [recommendation, setRecommendation] = useState<RecommendationWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRecommendation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecommendation();
      setRecommendation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const data = await regenerateRecommendation();
      setRecommendation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate recommendation');
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    loadRecommendation();
  }, [loadRecommendation]);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-indigo-500 text-sm font-semibold uppercase tracking-wide">Good morning!</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Today&apos;s Outfit</h1>
        <p className="text-sm text-gray-400 mt-0.5">{today}</p>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded-full w-3/4" />
            <div className="h-4 bg-gray-200 rounded-full w-full" />
            <div className="h-4 bg-gray-200 rounded-full w-2/3" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse">
            <div className="w-48 h-48 rounded-full bg-gray-200 mx-auto" />
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-400" fill="currentColor">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-800 font-semibold mb-1">No recommendation available</p>
          <p className="text-gray-500 text-sm mb-6 max-w-xs mx-auto">{error}</p>
          {(error.includes('Upload') || error.includes('No clothing')) ? (
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-full px-6 py-3 font-semibold hover:bg-indigo-700 transition-colors"
            >
              Upload Clothing
            </Link>
          ) : (
            <button
              onClick={loadRecommendation}
              className="bg-indigo-600 text-white rounded-full px-6 py-3 font-semibold hover:bg-indigo-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}

      {/* Recommendation */}
      {!loading && recommendation && (
        <div className="space-y-4">
          {/* Explanation card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <p className="text-gray-700 leading-relaxed">{recommendation.explanation}</p>
          </div>

          {/* Outfit items grid */}
          {recommendation.items && recommendation.items.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Recommended Items
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {recommendation.items.map(item => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
                  >
                    <div className="relative aspect-square bg-gray-50">
                      <Image
                        src={item.image_url}
                        alt={item.description || item.category}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-2">
                      <span className="text-xs font-medium text-gray-600 capitalize">{item.category}</span>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                      {item.colors && item.colors.length > 0 && (
                        <div className="flex gap-1 mt-1.5">
                          {item.colors.slice(0, 4).map((color, i) => (
                            <div
                              key={i}
                              className="w-3.5 h-3.5 rounded-full border border-gray-200"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color wheel section */}
          {recommendation.palette_colors && recommendation.palette_colors.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Color Harmony
              </h2>
              {recommendation.color_theory_description && (
                <p className="text-sm text-gray-600 mb-4">{recommendation.color_theory_description}</p>
              )}
              <ColorWheel
                colors={recommendation.palette_colors}
                scheme={recommendation.color_scheme}
                size={220}
              />
            </div>
          )}

          {/* Regenerate button */}
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="w-full bg-white border border-gray-200 text-gray-700 rounded-2xl py-3.5 font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {regenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating new outfit…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Regenerate Outfit
              </>
            )}
          </button>

          {/* Date info */}
          <p className="text-center text-xs text-gray-400 pb-2">
            Recommendation for {formatDate(recommendation.recommended_for)}
          </p>
        </div>
      )}
    </div>
  );
}
