import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.AI_API_KEY,
});

export async function getCompletion(options: {
  messages: any[];
  max_tokens?: number;
  temperature?: number;
}) {
  const primaryModel = 'google/gemini-2.5-flash';
  const fallbackModels = [
    'openrouter/free',
    'google/gemma-4-31b-it:free',
    'google/gemma-4-26b-a4b-it:free',
    'z-ai/glm-4.5-air:free'
  ];

  try {
    const response = await openai.chat.completions.create({
      model: primaryModel,
      ...options,
    });
    return response;
  } catch (error: any) {
    console.error(`[AI Config] Primary model (${primaryModel}) failed:`, error.message || error);
    
    // Check if error is related to payment / billing / credits / rate limits
    const isBillingOrRateError = 
      error.status === 402 || 
      error.status === 403 || 
      error.status === 429 || 
      error.message?.toLowerCase().includes('credit') || 
      error.message?.toLowerCase().includes('payment') || 
      error.message?.toLowerCase().includes('balance') ||
      error.message?.toLowerCase().includes('rate limit');
      
    if (isBillingOrRateError) {
      for (const fallbackModel of fallbackModels) {
        console.log(`[AI Config] Issue detected. Trying fallback model (${fallbackModel})...`);
        try {
          const fallbackResponse = await openai.chat.completions.create({
            model: fallbackModel,
            ...options,
          });
          console.log(`[AI Config] Fallback model (${fallbackModel}) succeeded!`);
          return fallbackResponse;
        } catch (fallbackError: any) {
          console.error(`[AI Config] Fallback model (${fallbackModel}) failed:`, fallbackError.message || fallbackError);
        }
      }
    }
    throw error;
  }
}

export default openai;