import { supabase } from './supabase';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

class AIService {
  private token: string;
  private endpoint: string;
  private modelName: string;
  private systemPrompt: string;
  private retryCount: number = 3;
  private retryDelay: number = 1000;

  constructor(token: string) {
    if (!token) {
      throw new Error('GitHub token is required');
    }
    this.token = token;
    this.endpoint = 'https://api.github.com/ai/chat/completions';
    this.modelName = 'gpt-4-vision-preview';
    this.systemPrompt = `You are an AI medical image analyzer. Your role is to:
1. Analyze medical images including X-rays, CT scans, MRIs, and other medical imaging
2. Provide detailed observations about the image contents
3. Identify potential abnormalities or areas of concern
4. Use medical terminology appropriately
5. Always include disclaimers about the preliminary nature of AI analysis
6. Recommend professional medical review for all findings

Important notes:
- Maintain professional medical terminology
- Be clear about limitations of AI analysis
- Structure responses clearly with sections for observations and findings
- Always recommend professional medical review
- Never make definitive diagnoses`;
  }

  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.retryCount; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
          },
        });

        if (response.ok) {
          return response;
        }

        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      } catch (error) {
        lastError = error as Error;
        if (i === this.retryCount - 1) break;
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (i + 1))); // Exponential backoff
      }
    }

    throw lastError || new Error('Failed to fetch after multiple retries');
  }

  async analyzeImage(imageUrl: string): Promise<string> {
    try {
      const messages = [
        {
          role: 'system',
          content: this.systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please analyze this medical image and provide detailed observations.'
            },
            {
              type: 'image_url',
              image_url: imageUrl
            }
          ]
        }
      ];

      const response = await this.fetchWithRetry(`${this.endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages,
          max_tokens: 1000,
          temperature: 0.7
        }),
      });

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI Service Error:', error);
      if (error instanceof Error) {
        if (error.message.includes('token')) {
          throw new Error('Invalid GitHub token. Please check your environment variables.');
        }
        if (error.message.includes('502')) {
          throw new Error('Server is temporarily unavailable. Please try again in a few moments.');
        }
      }
      throw new Error('Failed to analyze image. Please try again.');
    }
  }

  async saveChatHistory(userId: string, messages: Message[]) {
    try {
      const { error } = await supabase
        .from('chat_history')
        .insert({
          user_id: userId,
          messages: messages,
          created_at: new Date().toISOString(),
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save chat history:', error);
    }
  }
}

export const createAIService = (token: string) => {
  return new AIService(token);
};