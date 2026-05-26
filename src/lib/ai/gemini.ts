import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import type { WardrobeAIProvider, WeatherContext } from './types';
import type { ClothingAnalysis, ClothingItem } from '@/types';
import { logger } from '@/lib/logger';

export class GeminiProvider implements WardrobeAIProvider {
  private client: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.AI_MODEL || 'gemini-2.5-flash';
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

    logger.info('calling Gemini: analyze clothing', { model: this.modelName, mimeType });
    const result = await model.generateContent([prompt, imagePart]);
    const text = result.response.text().trim();

    // Strip markdown code blocks if present
    const jsonText = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();

    try {
      const parsed = JSON.parse(jsonText);
      const analysis = {
        category: parsed.category || 'other',
        colors: Array.isArray(parsed.colors) ? parsed.colors : [],
        color_names: Array.isArray(parsed.color_names) ? parsed.color_names : [],
        description: parsed.description || '',
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      };
      logger.info('Gemini response: analyze clothing', { category: analysis.category, tags: analysis.tags });
      return analysis;
    } catch {
      logger.error('Gemini response parse failed: analyze clothing', { response: text.substring(0, 200) });
      throw new Error(`Failed to parse Gemini response as JSON: ${text.substring(0, 200)}`);
    }
  }

  async recommendOutfit(items: ClothingItem[], context?: WeatherContext): Promise<{
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

    const weatherLine = context
      ? `Current Seattle conditions: ${context.temperatureF}°F (feels like ${context.apparentF}°F), ${context.conditions}, wind ${context.windMph} mph.`
      : '';

    const seasonLine = context
      ? `Today is ${context.month}, ${context.season} in Seattle, Washington. Time of day: ${context.timeOfDay}.`
      : 'Consider the current season when selecting items.';

    const prompt = `You are an expert fashion stylist. ${seasonLine}
${weatherLine}

${context ? `Consider when selecting the outfit:
- Temperature and feel — recommend layers if cool/cold, lighter pieces if warm
- Precipitation — if it's raining or drizzling, prefer water-resistant or waterproof outerwear
- Wind — factor in warmth needs
- Time of day — morning/daytime outfits should be practical; evening outfits can be more relaxed or elevated` : ''}

Rules:
- Pick exactly 1 top (or 1 dress/jumpsuit), 1 bottom (skip if dress/jumpsuit chosen), optionally 1 outerwear and 1 pair of shoes, and optionally 1-2 accessories.
- Never select two items from the same category, except accessories.
- Only use IDs from the wardrobe list below.
- Prioritise colour harmony.

Wardrobe items:
${JSON.stringify(itemsSummary, null, 2)}

Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "item_ids": ["2-5 item IDs forming a complete outfit"],
  "explanation": "2-3 friendly sentences on why this outfit works and suits the current weather and time of day",
  "color_scheme": "one of: monochromatic, complementary, analogous, triadic, neutral, contrast",
  "color_theory_description": "1-2 sentences explaining the colour theory behind this outfit combination",
  "palette_colors": ["3-5 hex color codes representing the outfit palette"]
}`;

    logger.info('calling Gemini: recommend outfit', { model: this.modelName, itemCount: items.length });
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

      const recommendation = {
        item_ids: finalIds,
        explanation: parsed.explanation || 'A stylish outfit for today.',
        color_scheme: parsed.color_scheme || 'neutral',
        color_theory_description: parsed.color_theory_description || 'Colors work harmoniously together.',
        palette_colors: Array.isArray(parsed.palette_colors) ? parsed.palette_colors : [],
      };
      logger.info('Gemini response: recommend outfit', { selectedItemCount: finalIds.length, colorScheme: recommendation.color_scheme });
      return recommendation;
    } catch {
      logger.error('Gemini response parse failed: recommend outfit', { response: text.substring(0, 200) });
      throw new Error(`Failed to parse Gemini recommendation response: ${text.substring(0, 200)}`);
    }
  }
}
