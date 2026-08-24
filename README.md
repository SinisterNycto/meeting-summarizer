# Meeting Summarizer

Meeting Summarizer is a simple, cost-free, and private web application that transcribes and summarizes audio files entirely in your browser.

## Features

- Client-Side AI Processing: By utilizing Web Workers and Transformers.js, the application downloads and runs AI models entirely on your local machine. No audio is ever sent to a remote server, ensuring complete privacy.
- Speech-to-Text (ASR): Integrates Xenova/whisper-base.en to accurately convert spoken audio into text.
- Summarization: Uses Xenova/distilbart-cnn-6-6 to condense transcripts into high-level summaries.
- Action Item Extraction: Features a keyword-based algorithm that scans the transcript and summary for actionable tasks.
- Responsive Design: Built with Next.js and Tailwind CSS for a modern, glassmorphism-styled interface.

## Getting Started

### Prerequisites

- Node.js installed on your local machine.

### Installation

1. Clone the repository or download the source code.
2. Install the required dependencies:

```bash
npm install
```

### Running the Application

To ensure proper compatibility with Web Workers during development, we recommend running the server with Webpack:

```bash
npm run dev -- --webpack
```

Open `http://localhost:3000` in your browser.

Note: The first time you process an audio file, it may take a few moments as your browser downloads the Whisper and DistilBART models from the Hugging Face Hub. Once downloaded, they are cached for faster use on subsequent uploads.

## Technology Stack

- Next.js
- React
- Tailwind CSS
- Transformers.js (for running Hugging Face models in the browser)
- Web Workers

## License

This project is open-source and free to use.
