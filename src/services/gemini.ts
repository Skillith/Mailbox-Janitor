import { GoogleGenerativeAI } from '@google/generative-ai';

export interface EmailMetadata {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
}

export interface EmailClassification {
  id: string;
  category: 'personal' | 'newsletter' | 'notification' | 'clutter';
  reason: string;
  confidence: number;
}

/**
 * Classify a batch of emails using Gemini
 */
export const classifyEmails = async (
  apiKey: string,
  emails: EmailMetadata[]
): Promise<EmailClassification[]> => {
  if (!apiKey) throw new Error('Gemini API key is required. Please check your Settings.');
  if (emails.length === 0) return [];

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // Using gemini-2.5-flash for speed and structural accuracy
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const prompt = `Classify the following emails into one of these categories:
- 'personal': Important emails from real humans, direct personal/business correspondence, and interactive conversations.
- 'newsletter': Media, blogs, regular newsletter publications, digests, and reading subscriptions.
- 'notification': Transactional updates, shipping notifications, order receipts, security/login alerts, password resets, and tool notification alerts (e.g. GitHub, Jira, Slack notifications).
- 'clutter': Low-value promotional marketing, cold outreach sales pitches, spam-adjacent mail, and bulk advertising.

For each email, output a JSON object containing:
- id: string matching the input email id
- category: one of the 4 values above (all lowercase)
- reason: a concise explanation of why it fits this category (max 8 words)
- confidence: a float between 0 and 1 representing your classification confidence

Input email list:
${JSON.stringify(emails, null, 2)}

Return a JSON array of these classification objects. Do not wrap it in markdown code blocks.`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // Just in case it returned markdown block
    const cleanText = text.replace(/```json/i, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as EmailClassification[];
  } catch (error) {
    console.error('Error classifying emails with Gemini:', error);
    throw error;
  }
};

/**
 * Generate a smart, readable summary for newsletter emails to display in the Digest
 */
export const summarizeNewsletter = async (
  apiKey: string,
  subject: string,
  snippet: string,
  body?: string
): Promise<string> => {
  if (!apiKey) return snippet || 'No content to summarize.';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const content = `Subject: ${subject}\nSnippet: ${snippet}\nBody: ${body || ''}`.substring(0, 4000); // safety cap
  const prompt = `Read the following newsletter email and generate a bulleted summary. Focus only on the main takeaways, news, or value. Keep it to exactly 2-3 short, engaging bullet points:
  
${content}`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (e) {
    console.error('Error summarizing newsletter:', e);
    return snippet || 'Summary unavailable.';
  }
};
