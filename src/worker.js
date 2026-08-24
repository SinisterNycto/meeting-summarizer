import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we are downloading from Hugging Face hub
env.allowLocalModels = false;

// Preload pipelines
let transcriber = null;
let summarizer = null;

async function getTranscriber() {
  if (!transcriber) {
    self.postMessage({ status: 'loading', message: 'Loading Speech-to-Text Model (whisper-tiny.en)...' });
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en');
  }
  return transcriber;
}

async function getSummarizer() {
  if (!summarizer) {
    self.postMessage({ status: 'loading', message: 'Loading Summarization Model (distilbart-cnn-6-6)...' });
    summarizer = await pipeline('summarization', 'Xenova/distilbart-cnn-6-6');
  }
  return summarizer;
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
  const { type, audioData } = event.data;

  if (type === 'process') {
    try {
      // 1. Transcription
      const transcribePipeline = await getTranscriber();
      self.postMessage({ status: 'processing', message: 'Transcribing audio...' });
      
      const transcriptResult = await transcribePipeline(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false
      });
      
      const text = transcriptResult.text;
      self.postMessage({ status: 'update', message: 'Transcription complete.', type: 'transcript', data: text });

      // 2. Summarization
      const summarizePipeline = await getSummarizer();
      self.postMessage({ status: 'processing', message: 'Summarizing transcript...' });
      
      // We chunk the text if it's too long, but for simplicity, we summarize it directly.
      const summaryResult = await summarizePipeline(text, {
        max_new_tokens: 150,
        min_new_tokens: 30,
      });

      const summary = summaryResult[0].summary_text;
      self.postMessage({ status: 'update', message: 'Summarization complete.', type: 'summary', data: summary });

      // 3. Action Items extraction (Simple keyword-based extraction since we are using a basic summarizer)
      self.postMessage({ status: 'processing', message: 'Extracting action items...' });
      const sentences = (text + ' ' + summary).split('.');
      const actionKeywords = ['will', 'need to', 'must', 'should', 'action', 'task', 'todo', 'to do'];
      
      let actionItems = sentences
        .map(s => s.trim())
        .filter(s => actionKeywords.some(keyword => s.toLowerCase().includes(keyword)))
        .slice(0, 5) // Keep top 5
        .map(s => s + '.');
      
      if (actionItems.length === 0) {
        actionItems = ["No specific action items detected."];
      }

      self.postMessage({ status: 'update', message: 'Action items extracted.', type: 'action_items', data: actionItems });
      
      self.postMessage({ status: 'complete', message: 'All processing finished!' });

    } catch (error) {
      console.error(error);
      self.postMessage({ status: 'error', message: error?.message || 'An error occurred during processing.' });
    }
  }
});
