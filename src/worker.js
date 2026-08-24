import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we are downloading from Hugging Face hub
env.allowLocalModels = false;

// Preload pipelines
let transcriber = null;
let summarizer = null;

async function getTranscriber() {
  if (!transcriber) {
    self.postMessage({ status: 'loading', message: 'Loading better Speech-to-Text Model (whisper-base.en)...' });
    transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-base.en');
  }
  return transcriber;
}

async function getSummarizer() {
  if (!summarizer) {
    self.postMessage({ status: 'loading', message: 'Loading Summarization Model...' });
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
      
      // If the text is extremely short (like the harvard.wav test file), we don't force min_new_tokens
      const isShortText = text.split(' ').length < 40;
      
      const summaryResult = await summarizePipeline(text, {
        max_new_tokens: 150,
        min_new_tokens: isShortText ? 0 : 30, // Prevent hallucination on short texts
      });

      const summary = summaryResult[0].summary_text;
      self.postMessage({ status: 'update', message: 'Summarization complete.', type: 'summary', data: summary });

      // 3. Action Items extraction (Enhanced keyword-based extraction)
      self.postMessage({ status: 'processing', message: 'Extracting action items...' });
      const sentences = (text + ' ' + summary).match(/[^.?!]+[.?!]+/g) || [text];
      const actionKeywords = ['will', 'need to', 'must', 'should', 'action', 'task', 'todo', 'to do', 'going to', 'let\'s', 'plan to', 'please'];
      
      let actionItems = sentences
        .map(s => s.trim())
        .filter(s => actionKeywords.some(keyword => s.toLowerCase().includes(keyword)))
        .slice(0, 5); // Keep top 5
      
      if (actionItems.length === 0) {
        actionItems = ["No specific action items detected in this snippet."];
      }

      self.postMessage({ status: 'update', message: 'Action items extracted.', type: 'action_items', data: actionItems });
      
      self.postMessage({ status: 'complete', message: 'Processing finished successfully!' });

    } catch (error) {
      console.error(error);
      self.postMessage({ status: 'error', message: error?.message || 'An error occurred during processing.' });
    }
  }
});
