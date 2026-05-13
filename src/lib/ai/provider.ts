import type { WardrobeAIProvider } from './types';
import { GeminiProvider } from './gemini';

let _provider: WardrobeAIProvider | null = null;

export function getAIProvider(): WardrobeAIProvider {
  if (_provider) return _provider;

  const providerName = process.env.AI_PROVIDER || 'gemini';

  switch (providerName.toLowerCase()) {
    case 'gemini':
      _provider = new GeminiProvider();
      return _provider;
    default:
      throw new Error(
        `Unknown AI provider: "${providerName}". Set AI_PROVIDER env var to a supported provider (e.g., "gemini").`
      );
  }
}
