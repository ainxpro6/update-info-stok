import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UploadCloud, Copy, Download, Trash2, Check, Image as ImageIcon, Settings, X, Info } from 'lucide-react';

const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return isNaN(d) ? "" : `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const CITIES = ["Bogor", "Jakarta", "Palembang"];

export default function App() {
  // --- Form State ---
  const [city, setCity] = useState("Bogor");
  
  // Set default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [date, setDate] = useState(tomorrow.toISOString().split('T')[0]);
  
  const [timeStart, setTimeStart] = useState("09:00");
  const [timeEnd, setTimeEnd] = useState("10:00");
  
  const [drafts, setDrafts] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null); // { type, message }
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef(null);

  // Use refs for the paste listener so it always has the latest form values
  const formStateRef = useRef({ city, date, timeStart, timeEnd });
  useEffect(() => {
    formStateRef.current = { city, date, timeStart, timeEnd };
  }, [city, date, timeStart, timeEnd]);

  // --- Logic: Auto Update End Time ---
  const handleTimeStartChange = (e) => {
    const newStart = e.target.value;
    setTimeStart(newStart);
    if (newStart) {
      let [h, m] = newStart.split(':');
      let nextH = String((parseInt(h) + 1) % 24).padStart(2, '0');
      setTimeEnd(`${nextH}:${m}`);
    }
  };

  // --- Logic: Image Processing (Canvas) ---
  const generatePoster = async (file) => {
    const state = formStateRef.current;
    const captionText = `${state.city} — ${formatDate(state.date)} Jam ${state.timeStart} - ${state.timeEnd}`;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Define canvas dimensions
        const TEXT_AREA_HEIGHT = Math.max(120, img.height * 0.15); // proportional or min 120px
        canvas.width = img.width;
        canvas.height = img.height + TEXT_AREA_HEIGHT;

        // 1. Draw original image
        ctx.drawImage(img, 0, 0);

        // 2. Draw text area background (slate-900)
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, img.height, canvas.width, TEXT_AREA_HEIGHT);

        // 3. Draw text
        ctx.fillStyle = '#f8fafc'; // slate-50
        const fontSize = Math.max(36, Math.floor(canvas.width / 25)); // Scale text based on image width
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(captionText, canvas.width / 2, img.height + (TEXT_AREA_HEIGHT / 2));

        // Export as Blob and DataURL
        canvas.toBlob((blob) => {
          resolve({ 
            blob, 
            dataUrl: canvas.toDataURL('image/png'),
            caption: captionText
          });
          URL.revokeObjectURL(objectUrl);
        }, 'image/png', 1.0);
      };
      
      img.onerror = reject;
      img.src = objectUrl;
    });
  };

  const processFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    
    try {
      const result = await generatePoster(file);
      setDrafts(prev => [{
        id: Date.now().toString(),
        originalFile: file,
        posterBlob: result.blob,
        posterUrl: result.dataUrl,
        caption: result.caption,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);
    } catch (err) {
      console.error("Error generating poster:", err);
      showToast('error', 'Failed to process image.');
    }
  };

  // --- Event Handlers ---
  const onFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
    // Reset input so same file can be selected again
    e.target.value = null; 
  };

  const onDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);
  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  // Global Paste Listener
  useEffect(() => {
    const handlePaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = item.getAsFile();
          processFile(blob);
          return;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const clearAll = () => {
    setShowClearConfirm(true);
  };

  const confirmClearAll = () => {
    setDrafts([]);
    setShowClearConfirm(false);
    showToast('success', 'All drafts cleared.');
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8" style={{ colorScheme: 'dark' }}>
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Update Info Tool
          </h1>
          <p className="text-slate-400 text-sm md:text-base">
            Configure details below, then paste or drop an image to automatically generate a poster.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Controls & Upload */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Configuration Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 mb-2 text-slate-300 font-medium">
                <Settings size={18} />
                <h2>Event Details</h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">City</label>
                  <select 
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  >
                    {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start</label>
                    <input 
                      type="time" 
                      value={timeStart}
                      onChange={handleTimeStartChange}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End</label>
                    <input 
                      type="time" 
                      value={timeEnd}
                      onChange={(e) => setTimeEnd(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dropzone */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 ${
                isDragging 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                accept="image/*" 
                onChange={onFileSelect} 
                className="hidden" 
              />
              <UploadCloud className={`w-10 h-10 mb-3 ${isDragging ? 'text-blue-400' : 'text-slate-400'}`} />
              <p className="text-sm font-medium text-slate-200 text-center">
                Click, drag, or paste image
              </p>
              <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG</p>
            </div>

          </div>

          {/* Right Column: Drafts */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon size={20} className="text-blue-400" />
                Generated Posters ({drafts.length})
              </h2>
              {drafts.length > 0 && (
                <button 
                  onClick={clearAll}
                  className="text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>

            {drafts.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 border border-slate-800 border-dashed rounded-2xl">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No posters generated yet.</p>
                <p className="text-xs mt-1 opacity-70">Paste an image to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drafts.map(draft => (
                  <DraftCard key={draft.id} draft={draft} setDrafts={setDrafts} showToast={showToast} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Custom Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-100 mb-2">Clear all drafts?</h3>
            <p className="text-slate-400 text-sm mb-6">This action cannot be undone. All your generated posters will be removed.</p>
            <div className="flex gap-3 justify-end">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={confirmClearAll}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 transition-all ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
          {toast.type === 'error' ? <X size={18} /> : <Check size={18} />}
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      )}
    </div>
  );
}

// --- Subcomponent: Draft Card ---
function DraftCard({ draft, setDrafts, showToast }) {
  const [copyImageState, setCopyImageState] = useState('idle'); // idle | copying | success | error
  const [copyTextState, setCopyTextState] = useState('idle');

  const removeDraft = () => {
    setDrafts(prev => prev.filter(d => d.id !== draft.id));
  };

  const copyImage = async () => {
    setCopyImageState('copying');
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': draft.posterBlob })
      ]);
      setCopyImageState('success');
      showToast('success', 'Poster copied to clipboard!');
    } catch (err) {
      console.error('Clipboard copy failed:', err);
      setCopyImageState('error');
      showToast('error', 'Image copy blocked by browser permissions. Please use the Save button.');
    }
    setTimeout(() => setCopyImageState('idle'), 2000);
  };

  const copyText = async () => {
    setCopyTextState('copying');
    try {
      // Attempt modern API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(draft.caption);
      } else {
        throw new Error("Modern clipboard API blocked");
      }
      setCopyTextState('success');
      showToast('success', 'Text copied to clipboard!');
    } catch (err) {
      // Fallback for text copying using older execCommand (works well in iframes)
      try {
        const textArea = document.createElement("textarea");
        textArea.value = draft.caption;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
        
        setCopyTextState('success');
        showToast('success', 'Text copied to clipboard!');
      } catch (e) {
        setCopyTextState('error');
        showToast('error', 'Failed to copy text.');
      }
    }
    setTimeout(() => setCopyTextState('idle'), 2000);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = draft.posterUrl;
    link.download = `Poster_${draft.id}.png`;
    link.click();
  };

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-lg">
      
      {/* Image Preview */}
      <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden border-b border-slate-800">
        <img 
          src={draft.posterUrl} 
          alt="Generated Poster" 
          className="object-contain w-full h-full p-2"
        />
        {/* Remove Button - Shows on Hover */}
        <button 
          onClick={removeDraft}
          className="absolute top-2 right-2 p-1.5 bg-slate-950/80 hover:bg-red-500 text-slate-300 hover:text-white rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
          title="Remove Draft"
        >
          <X size={16} />
        </button>
      </div>

      {/* Details & Actions */}
      <div className="p-4 flex flex-col flex-grow justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug">
            {draft.caption}
          </p>
          <p className="text-xs text-slate-500 mt-1">Generated at {draft.timestamp}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton 
            onClick={copyImage} 
            state={copyImageState} 
            icon={<Copy size={14} />} 
            text="Poster" 
            primary 
          />
          <ActionButton 
            onClick={copyText} 
            state={copyTextState} 
            icon={<Copy size={14} />} 
            text="Text" 
          />
          <button 
            onClick={downloadImage}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="Download Image"
          >
            <Download size={14} />
            <span className="hidden xl:inline">Save</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponent: Action Button ---
function ActionButton({ onClick, state, icon, text, primary }) {
  const isSuccess = state === 'success';
  const isError = state === 'error';
  const isLoading = state === 'copying';

  let bgClasses = primary 
    ? 'bg-blue-600 hover:bg-blue-500 text-white' 
    : 'bg-slate-800 hover:bg-slate-700 text-slate-300';

  if (isSuccess) bgClasses = 'bg-emerald-500 text-white';
  if (isError) bgClasses = 'bg-red-500 text-white';

  return (
    <button 
      onClick={onClick}
      disabled={isLoading || isSuccess}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-80 disabled:cursor-not-allowed ${bgClasses}`}
    >
      {isSuccess ? <Check size={14} /> : icon}
      <span>{isSuccess ? 'Copied' : text}</span>
    </button>
  );
}
