import type { ClothingAnalysis, ClothingItem } from '@/types';
import type { WeatherContext } from '@/lib/weather';

export type { WeatherContext };

export interface WardrobeAIProvider {
  analyzeClothing(imageBuffer: Buffer, mimeType: string): Promise<ClothingAnalysis>;
  recommendOutfit(items: ClothingItem[], context?: WeatherContext): Promise<{
    item_ids: string[];
    explanation: string;
    color_scheme: string;
    color_theory_description: string;
    palette_colors: string[];
  }>;
}
