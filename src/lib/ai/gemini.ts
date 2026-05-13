import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import type { WardrobeAIProvider } from './types';
import type { ClothingAnalysis, ClothingItem } from '@/types';

export class GeminiProvider implements WardrobeAIProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.AI_MODEL || 'gemini-1.5-flash';
  }

  async analyzeClothing(imageBuffer: Buffer, mimeType: string): Promise<ClothingAnalysis> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const imagePart: Part = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType,
      },
    };

    const prompt = `Analyze this clothing item and respond with ONLY a valid JSON object (no markdown, no code blocks) with exactly these fields:
{
  "category": "one of: tops, bottoms, dresses, outerwear, shoes, accessories, activewear, formal, underwear, other",
  "colors": ["array of dominant hex color codes like #FF5733"],
  "color_names": ["array of human-readable color names like 'coral red'"],
  "description": "brief one-sentence description of the item",
  "tags": ["array of descriptive tags like 'casual', 'summer', 'cotton', 'striped'"]
}

Be accurate with hex colors - sample the actual dominant colors in the image. Include 1-4 colors.`;

    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim();

    // Strip markdown code blocks if present
    const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
      const parsed = JSON.parse(jsonText);
      return {
        category: parsed.category || 'other',
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        color_names: Array.isArray(parsed.color_names) ? parsed.color_names : [],
        description: parsed.description || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    } catch {
      throw new Error(`Failed to parse Gemini response as JSON: ${text.substring(0, 200)}`);
    }
  }

  async recommendOutfit(items: ClothingItem[]): Promise<{
    item_ids: string[];
    explanation: string;
    color_scheme: string;
    color_theory_description: string;
    palette_colors: string[];
  }> {
    const model = this.client.getGenerativeModel({ model: this.modelName });

    const itemsSummary = items.map(item => ({
      id: item.id,
      category: item.category,
      colors: item.colors,
      color_names: item.color_names,
      description: item.description,
      tags: item.tags,
    }));

    const prompt = `You are a fashion stylist. Given these wardrobe items, recommend a stylish outfit for today.

Wardrobe items:
${JSON.stringify(itemsSummary, null, 2)}

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "item_ids": ["array of 2-4 item IDs from the wardrobe that make a complete outfit"],
  "explanation": "friendly explanation of why this outfit works well together, 2-3 sentences",
  "color_scheme": "one of: monochromatic, complementary, analogous, triadic, neutral, contrast",
  "color_theory_description": "1-2 sentences explaining the color theory behind this outfit combination",
  "palette_colors": ["array of 3-5 hex color codes representing the full color palette of the outfit"]
}

Select items that work well together stylistically and for the current season (May, spring). Prioritize color harmony.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
      const parsed = JSON.parse(jsonText);

      // Validate item_ids exist in items
      const validIds = new Set(items.map(i => i.id));
      const filteredIds = (parsed.item_ids || []).filter((id: string) => validIds.has(id));

      // Ensure at least one valid item
      const finalIds = filteredIds.length > 0 ? filteredIds : [items[0]?.id].filter(Boolean);

      return {
        item_ids: finalIds,
        explanation: parsed.explanation || 'A stylish outfit for today.',
        color_scheme: parsed.color_scheme || 'neutral',
        color_theory_description: parsed.color_theory_description || 'Colors work harmoniously together.',
        palette_colors: Array.isArray(parsed.palette_colors) ? parsed.palette_colors : [],
      };
    } catch {
      throw new Error(`Failed to parse Gemini recommendation response: ${text.substring(0, 200)}`);
    }
  }
}
