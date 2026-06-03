/**
 * Utility to extract clean HTML code from LLM response text.
 * It handles markdown code blocks (e.g. ```html) and any conversational text
 * at the beginning or end of the response.
 */
export function extractHtml(content: string): string {
  if (!content) return '';

  // 1. Try matching ```html ... ``` block (case-insensitive)
  const htmlBlockRegex = /```html\s*([\s\S]*?)\s*```/i;
  const htmlMatch = content.match(htmlBlockRegex);
  if (htmlMatch && htmlMatch[1]) {
    return htmlMatch[1].trim();
  }

  // 2. Try matching any generic ``` ... ``` block
  const genericBlockRegex = /```\s*([\s\S]*?)\s*```/;
  const genericMatch = content.match(genericBlockRegex);
  if (genericMatch && genericMatch[1]) {
    return genericMatch[1].trim();
  }

  // 3. Try matching from <!DOCTYPE html> or <html to </html>
  const docTypeRegex = /(<!DOCTYPE html[\s\S]*?<\/html>|<html[\s\S]*?<\/html>)/i;
  const docTypeMatch = content.match(docTypeRegex);
  if (docTypeMatch && docTypeMatch[0]) {
    return docTypeMatch[0].trim();
  }

  // 4. Fallback: clean raw block markdown markers
  let cleaned = content.replace(/```[a-z]*\n?/gi, '').replace(/```$/g, '').trim();
  
  // 5. If the HTML got truncated (e.g. missing closing tags), auto-repair it
  if (cleaned.includes('<html') && !cleaned.includes('</html>')) {
    console.warn('[HTML Parser] Truncated HTML detected. Attempting repair...');
    // Simple repair: append closing tags if they are missing
    if (!cleaned.includes('</body>')) {
      cleaned += '\n</body>';
    }
    cleaned += '\n</html>';
  }

  return cleaned;
}
