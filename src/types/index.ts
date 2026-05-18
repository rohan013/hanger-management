export interface ClothingItem {
  id: string;
  category: string;
  colors: string[];
  color_names: string[];
  description: string | null;
  tags: string[];
  image_url: string;
  blob_pathname: string;
  created_at: string;
}

export interface ClothingAnalysis {
  category: string;
  colors: string[];
  color_names: string[];
  description: string;
  tags: string[];
}

export interface OutfitRecommendation {
  id: string;
  item_ids: string[];
  explanation: string;
  color_scheme: string;
  color_theory_description: string;
  palette_colors: string[];
  recommended_for: string;
  created_at: string;
}

export interface RecommendationWithItems extends OutfitRecommendation {
  items: ClothingItem[];
}

