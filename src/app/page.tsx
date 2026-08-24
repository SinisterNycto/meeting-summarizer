"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { UploadCloud, FileAudio, Loader2, CheckCircle2, ListTodo, FileText, ChevronRight } from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "processing" | "complete" | "error">("idle");
  const [message, setMessage] = useState<string>("Ready to process audio.");
  const [transcript, setTranscript] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [actionItems, setActionItems] = useState<string[]>([]);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Web Worker
    workerRef.current = new Worker(new URL("../worker.js", import.meta.url), {
      type: "module",
    });

    workerRef.current.addEventListener("message", (e) => {
      const { status, message, type, data } = e.data;
      
      if (status === "loading" || status === "processing") {
        setStatus("processing");
        setMessage(message);
      } else if (status === "update") {
        setMessage(message);
        if (type === "transcript") setTranscript(data);
        if (type === "summary") setSummary(data);
        if (type === "action_items") setActionItems(data);
      } else if (status === "complete") {
        setStatus("complete");
        setMessage("Processing finished successfully.");
      } else if (status === "error") {
        setStatus("error");
        setMessage(message);
      }
    });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const decodeAudio = async (file: File): Promise<Float32Array> => {
    const arrayBuffer = await file.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer.getChannelData(0); // Whisper expects 16kHz Float32Array mono
  };

  const processAudio = async () => {
    if (!file || !workerRef.current) return;

    setStatus("loading");
    setMessage("Decoding audio file...");
    setTranscript("");
    setSummary("");
    setActionItems([]);

    try {
      const audioData = await decodeAudio(file);
      workerRef.current.postMessage({
        type: "process",
        audioData,
      });
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Failed to decode audio file. Please ensure it's a valid audio format.");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center py-12 px-4 sm:px-8 relative overflow-hidden text-slate-100">
      
      {/* Header */}
      <div className="z-10 w-full max-w-4xl text-center mb-12 mt-8">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 drop-shadow-sm">
          Meeting Summarizer
        </h1>
        <p className="text-lg md:text-xl text-slate-300 font-light max-w-2xl mx-auto">
          100% Free & Private. Runs entirely in your browser using local AI models. 
          Upload an audio file to get a transcript, summary, and action items instantly.
        </p>
      </div>

      <div className="z-10 w-full max-w-4xl grid grid-cols-1 gap-8">
        
        {/* Upload Section */}
        <section className="glass-panel rounded-3xl p-8 transition-all duration-300">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-500/50 rounded-2xl py-12 px-6 bg-slate-900/30 hover:bg-slate-900/50 transition-colors group relative cursor-pointer">
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={status === "loading" || status === "processing"}
            />
            {file ? (
              <div className="flex flex-col items-center text-center">
                <FileAudio className="w-16 h-16 text-indigo-400 mb-4" />
                <p className="text-lg font-medium text-slate-200">{file.name}</p>
                <p className="text-sm text-slate-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <UploadCloud className="w-16 h-16 text-slate-400 group-hover:text-indigo-400 transition-colors mb-4" />
                <p className="text-xl font-medium text-slate-200 mb-2">Drag & drop your audio file</p>
                <p className="text-sm text-slate-400">or click to browse files (MP3, WAV, M4A)</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={processAudio}
              disabled={!file || status === "loading" || status === "processing"}
              className={`px-8 py-4 rounded-full font-semibold text-lg shadow-lg flex items-center transition-all duration-300 ${
                !file || status === "loading" || status === "processing"
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed opacity-50"
                  : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white transform hover:-translate-y-1 hover:shadow-indigo-500/25"
              }`}
            >
              {status === "loading" || status === "processing" ? (
                <>
                  <Loader2 className="animate-spin mr-3 w-5 h-5" />
                  Processing...
                </>
              ) : (
                <>
                  Generate Summary <ChevronRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
            
            {/* Status Message */}
            {(status !== "idle" || message) && (
              <div className="mt-6 flex items-center text-sm font-medium text-indigo-300">
                {status === "processing" || status === "loading" ? (
                  <Loader2 className="animate-spin mr-2 w-4 h-4" />
                ) : status === "complete" ? (
                  <CheckCircle2 className="text-emerald-400 mr-2 w-4 h-4" />
                ) : null}
                {message}
              </div>
            )}
          </div>
        </section>

        {/* Results Section */}
        {(transcript || summary || actionItems.length > 0) && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-8 duration-700 fade-in">
            
            {/* Transcript & Summary Column */}
            <div className="flex flex-col gap-6">
              <div className="glass-panel rounded-3xl p-6 h-full">
                <div className="flex items-center mb-4 text-indigo-300">
                  <FileText className="w-5 h-5 mr-2" />
                  <h2 className="text-xl font-semibold text-white">Summary</h2>
                </div>
                {summary ? (
                  <p className="text-slate-300 leading-relaxed text-sm md:text-base bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                    {summary}
                  </p>
                ) : (
                  <div className="animate-pulse bg-slate-800 h-24 rounded-xl w-full"></div>
                )}
              </div>
              
              <div className="glass-panel rounded-3xl p-6 h-full max-h-[400px] flex flex-col">
                <div className="flex items-center mb-4 text-indigo-300">
                  <FileAudio className="w-5 h-5 mr-2" />
                  <h2 className="text-xl font-semibold text-white">Full Transcript</h2>
                </div>
                <div className="overflow-y-auto flex-1 pr-2 custom-scrollbar">
                  {transcript ? (
                    <p className="text-slate-400 leading-relaxed text-sm bg-slate-900/40 p-4 rounded-xl border border-slate-700/50">
                      {transcript}
                    </p>
                  ) : (
                    <div className="animate-pulse flex flex-col gap-3 w-full">
                      <div className="bg-slate-800 h-4 rounded w-3/4"></div>
                      <div className="bg-slate-800 h-4 rounded w-full"></div>
                      <div className="bg-slate-800 h-4 rounded w-5/6"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Items Column */}
            <div className="glass-panel rounded-3xl p-6 h-full min-h-[300px]">
              <div className="flex items-center mb-6 text-purple-300">
                <ListTodo className="w-5 h-5 mr-2" />
                <h2 className="text-xl font-semibold text-white">Action Items</h2>
              </div>
              {actionItems.length > 0 ? (
                <ul className="space-y-4">
                  {actionItems.map((item, index) => (
                    <li key={index} className="flex items-start bg-slate-900/40 p-4 rounded-xl border border-slate-700/50 group hover:border-purple-500/30 transition-colors">
                      <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 border-purple-400 flex items-center justify-center mr-3 group-hover:bg-purple-400/20 transition-colors">
                        <CheckCircle2 className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-slate-300 text-sm md:text-base leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="animate-pulse flex flex-col gap-4 w-full">
                  <div className="bg-slate-800 h-16 rounded-xl w-full"></div>
                  <div className="bg-slate-800 h-16 rounded-xl w-full"></div>
                  <div className="bg-slate-800 h-16 rounded-xl w-full"></div>
                </div>
              )}
            </div>
            
          </section>
        )}
      </div>

    </main>
  );
}
