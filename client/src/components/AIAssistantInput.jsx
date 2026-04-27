import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Terminal, Mic, Square, Loader2 } from 'lucide-react';
import API_BASE_URL from '../config';

const AIAssistantInput = () => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Convert blob to base64
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = reader.result.split(',')[1];
          setIsSending(true);
          try {
            const res = await fetch(`${API_BASE_URL}/api/report/voice`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audio: base64Audio })
            });
            const data = await res.json();
            if (res.ok) {
              setInputValue(data.text || "");
              if (data.extracted) {
                alert(`Voice recognized: ${data.extracted.category} at ${data.extracted.location_name}`);
              }
            } else {
              alert(data.error || "Voice processing failed");
            }
          } catch (e) {
            alert("Voice server unreachable");
          } finally {
            setIsSending(false);
          }
        };
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: inputValue })
      });
      if (res.ok) {
        setInputValue("");
        alert("Emergency report logged successfully.");
      }
    } catch (e) {
      alert("Failed to send report");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-12 left-0 right-0 z-50 flex justify-center px-6">
      <motion.div 
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="w-full max-w-2xl relative"
      >
        <div className={`absolute inset-0 transition-opacity duration-700 blur-[40px] rounded-full ${isFocused || isRecording ? 'bg-oasis-red/20 opacity-100' : 'bg-white/5 opacity-0'}`} />
        
        <div className={`relative flex items-center p-1.5 transition-all duration-500 rounded-2xl glass-panel ${isFocused || isRecording ? 'shadow-[0_0_40px_rgba(255,255,255,0.05)] border-oasis-red/30' : 'border-white/10'}`}>
          <div className={`p-3 rounded-xl transition-colors duration-500 ${isFocused || isRecording ? 'bg-oasis-red text-white shadow-lg shadow-oasis-red/20' : 'bg-white/5 text-white/40'}`}>
            <Terminal className="w-5 h-5" />
          </div>
          
          <input 
            type="text" 
            placeholder={isRecording ? "Listening..." : "Describe the situation..."}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isSending}
            className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-white placeholder:text-white/20 font-medium"
          />
          
          <div className="flex items-center gap-3 px-4">
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-2 rounded-lg transition-all ${isRecording ? 'bg-oasis-red text-white animate-pulse' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              {isRecording ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <AnimatePresence>
              {inputValue && (
                <motion.button 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={handleSend}
                  disabled={isSending}
                  className="p-2 bg-oasis-red text-white rounded-lg hover:bg-oasis-red/80 transition-colors shadow-lg shadow-oasis-red/20"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Subtle status text below */}
        <motion.p 
          animate={{ opacity: isFocused ? 1 : 0, y: isFocused ? 10 : 0 }}
          className="absolute left-0 right-0 text-center text-[10px] text-white/30 font-bold tracking-[0.2em] uppercase pointer-events-none"
        >
          Neural Engine Listening • Awaiting Field Input
        </motion.p>
      </motion.div>
    </div>
  );
};

export default AIAssistantInput;
