'use server';
/**
 * @fileOverview A Genkit flow for summarizing video content from a given URL.
 *
 * - summarizeVideoUrl - A function that handles the video summarization process.
 * - SummarizeVideoUrlInput - The input type for the summarizeVideoUrl function.
 * - SummarizeVideoUrlOutput - The return type for the summarizeVideoUrl function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the video summarization flow.
const SummarizeVideoUrlInputSchema = z.object({
  videoUrl: z.string().url().describe('The URL of the video to be summarized.'),
});
export type SummarizeVideoUrlInput = z.infer<typeof SummarizeVideoUrlInputSchema>;

// Output schema for the video summarization flow.
const SummarizeVideoUrlOutputSchema = z.object({
  summary: z.string().describe('A brief summary of the video content.'),
});
export type SummarizeVideoUrlOutput = z.infer<typeof SummarizeVideoUrlOutputSchema>;

// Exported wrapper function for the Genkit flow.
export async function summarizeVideoUrl(input: SummarizeVideoUrlInput): Promise<SummarizeVideoUrlOutput> {
  return summarizeVideoUrlFlow(input);
}

// Define the prompt for video summarization.
const summarizeVideoPrompt = ai.definePrompt({
  name: 'summarizeVideoPrompt',
  input: {schema: SummarizeVideoUrlInputSchema},
  output: {schema: SummarizeVideoUrlOutputSchema},
  prompt: `You are an AI assistant tasked with summarizing video content.
Given a video URL, your goal is to provide a brief, concise, and informative summary of the video's content.
Focus on the main topics, key events, or overall message of the video.
The summary should be suitable for a watch party context, giving potential viewers a good idea of what the video is about.

Video URL: {{{videoUrl}}}
`,
});

// Define the Genkit flow for summarizing video URLs.
const summarizeVideoUrlFlow = ai.defineFlow(
  {
    name: 'summarizeVideoUrlFlow',
    inputSchema: SummarizeVideoUrlInputSchema,
    outputSchema: SummarizeVideoUrlOutputSchema,
  },
  async (input) => {
    const {output} = await summarizeVideoPrompt(input);
    if (!output) {
      throw new Error('Failed to generate video summary.');
    }
    return output;
  }
);
