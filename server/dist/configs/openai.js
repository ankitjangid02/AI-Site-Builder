import OpenAI from 'openai';
const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.AI_API_KEY,
});
export async function getCompletion(options) {
    const primaryModel = 'google/gemini-2.5-flash';
    const fallbackModel = 'z-ai/glm-4.5-air:free';
    try {
        const response = await openai.chat.completions.create({
            model: primaryModel,
            ...options,
        });
        return response;
    }
    catch (error) {
        console.error(`[AI Config] Primary model (${primaryModel}) failed:`, error.message || error);
        // Check if error is related to payment / billing / credits / rate limits
        const isBillingOrRateError = error.status === 402 ||
            error.status === 403 ||
            error.status === 429 ||
            error.message?.toLowerCase().includes('credit') ||
            error.message?.toLowerCase().includes('payment') ||
            error.message?.toLowerCase().includes('balance') ||
            error.message?.toLowerCase().includes('rate limit');
        if (isBillingOrRateError) {
            console.log(`[AI Config] Issue detected. Falling back to free model (${fallbackModel})...`);
            try {
                const fallbackResponse = await openai.chat.completions.create({
                    model: fallbackModel,
                    ...options,
                });
                return fallbackResponse;
            }
            catch (fallbackError) {
                console.error(`[AI Config] Fallback model (${fallbackModel}) also failed:`, fallbackError.message || fallbackError);
                throw fallbackError;
            }
        }
        throw error;
    }
}
export default openai;
