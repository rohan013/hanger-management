import type { ClothingAnalysis, ClothingItem } from '@/types';

export interface WardrobeAIProvider {
  analyzeClothing(imageBuffer: Buffer, mimeType: string): Promise<ClothingAnalysis>;
  recommendOutfit(items: ClothingItem[]): Promise<{
    item_ids: string[];
    explanation: string;
    color_scheme: string;
    color_theory_description: string;
    palette_colors: string[];
  }>;
}
