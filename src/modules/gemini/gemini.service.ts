import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class GeminiService {
  private readonly ai: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is missing in backend .env');
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async generateText(prompt: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: this.model,
      contents: prompt,
    });

    return response.text || '';
  }
}