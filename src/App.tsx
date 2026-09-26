import { useState, useCallback, useRef, useEffect } from 'react';
import {
  getPDFInfo,
  detectLabelConfig,
  processPDF,
  generateOutputPDFSmart,
  type LabelConfig,
  type ProcessingResult,
  type PageInfo,
} from './utils/pdfProcessor';
import { downloadSamplePDF } from './utils/samplePDF';

type AppState = 'idle' | 'uploaded' | 'processing' | 'complete' | 'error';
type Theme = 'dark' | 'light';

// TikTok-style Logo Component
function TikTokLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(-6, -6)">
        <rect x="130" y="80" width="252" height="340" rx="16" fill="none" stroke="#25F4EE" strokeWidth="12"/>
        <line x1="165" y1="140" x2="347" y2="140" stroke="#25F4EE" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="180" x2="310" y2="180" stroke="#25F4EE" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="220" x2="330" y2="220" stroke="#25F4EE" strokeWidth="10" strokeLinecap="round"/>
        <rect x="165" y="280" width="182" height="80" rx="4" fill="none" stroke="#25F4EE" strokeWidth="6"/>
      </g>
      <g transform="translate(6, 6)">
        <rect x="130" y="80" width="252" height="340" rx="16" fill="none" stroke="#FE2C55" strokeWidth="12"/>
        <line x1="165" y1="140" x2="347" y2="140" stroke="#FE2C55" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="180" x2="310" y2="180" stroke="#FE2C55" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="220" x2="330" y2="220" stroke="#FE2C55" strokeWidth="10" strokeLinecap="round"/>
        <rect x="165" y="280" width="182" height="80" rx="4" fill="none" stroke="#FE2C55" strokeWidth="6"/>
      </g>
      <g>
        <rect x="130" y="80" width="252" height="340" rx="16" fill="none" stroke="currentColor" strokeWidth="12"/>
        <line x1="165" y1="140" x2="347" y2="140" stroke="currentColor" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="180" x2="310" y2="180" stroke="currentColor" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="220" x2="330" y2="220" stroke="currentColor" strokeWidth="10" strokeLinecap="round"/>
        <rect x="165" y="280" width="182" height="80" rx="4" fill="none" stroke="currentColor" strokeWidth="6"/>
      </g>
    </svg>
  );
}

// Theme Toggle
function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-14 h-7 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#25F4EE]/50"
      style={{ backgroundColor: theme === 'dark' ? '#2F2F2F' : '#E0E0E0' }}
      aria-label="Toggle theme"
    >
      <div
        className="absolute top-0.5 w-6 h-6 rounded-full transition-all duration-200 flex items-center justify-center"
        style={{
          left: theme === 'dark' ? 'calc(100% - 1.625rem)' : '0.125rem',
          backgroundColor: theme === 'dark' ? '#25F4EE' : '#FE2C55',
        }}
      >
        {theme === 'dark' ? (
          <svg className="w-3.5 h-3.5 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </button>
  );
}

// Help Modal
function HelpModal({ isOpen, onClose, isDark }: { isOpen: boolean; onClose: () => void; isDark: boolean }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6 animate-slide-up"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(37, 244, 238, 0.1)' }}>
              <svg className="w-5 h-5" fill="#25F4EE" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                Why This Tool Exists
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                The problem we're solving
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {/* Problem */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(254, 44, 85, 0.05)', border: '1px solid rgba(254, 44, 85, 0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" fill="#FE2C55" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="font-semibold text-sm" style={{ color: '#FE2C55' }}>
                The Problem
              </h3>
            </div>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: '#FE2C55' }}>•</span>
                <span><strong>Duplicate Carton Labels:</strong> TikTok FBT provides 2 identical labels per carton (for both sides), but Amazon AWD only accepts 1 label per carton.</span>
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: '#FE2C55' }}>•</span>
                <span><strong>Wrong Format:</strong> Manually removing duplicates changes the PDF format, making labels larger than the required 4×6 inches that Amazon requires.</span>
              </li>
            </ul>
          </div>

          {/* Old Workaround */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h1v2a1 1 0 102 0v-2h1a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-muted)' }}>
                Old Manual Workaround
              </h3>
            </div>
            <ol className="space-y-1.5 text-xs list-decimal list-inside" style={{ color: 'var(--text-muted)' }}>
              <li>Open TikTok PDF → Print → Manually deselect every 2nd page</li>
              <li>Save trimmed PDF</li>
              <li>Upload to ChatGPT</li>
              <li>Ask ChatGPT to resize to 4×6 inches</li>
              <li>Download resized PDF</li>
            </ol>
            <p className="mt-2 text-xs italic" style={{ color: 'var(--text-muted)' }}>
              ⏱ Time-consuming, error-prone, requires external tools
            </p>
          </div>

          {/* Solution */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'rgba(37, 244, 238, 0.05)', border: '1px solid rgba(37, 244, 238, 0.2)' }}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4" fill="#25F4EE" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h3 className="font-semibold text-sm" style={{ color: '#25F4EE' }}>
                The Solution (This Tool)
              </h3>
            </div>
            <ol className="space-y-1.5 text-xs list-decimal list-inside" style={{ color: 'var(--text-secondary)' }}>
              <li><strong>Upload</strong> TikTok FBT PDF</li>
              <li><strong>Auto-detect</strong> duplicate pages</li>
              <li><strong>Remove duplicates</strong> (keep 1 of every 2)</li>
              <li><strong>Resize</strong> to exact 4×6 inches</li>
              <li><strong>Download</strong> Amazon-compliant PDF</li>
            </ol>
            <p className="mt-2 text-xs italic" style={{ color: '#25F4EE' }}>
              ⚡ Instant, automated, no external tools needed
            </p>
          </div>

          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(254, 44, 85, 0.05)', border: '1px solid rgba(254, 44, 85, 0.2)' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#FE2C55' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h1v2a1 1 0 102 0v-2h1a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Old Way
              </p>
              <ul className="space-y-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <li>⏱️ 10-15 min per batch</li>
                <li>❌ Manual page deletion</li>
                <li>❌ Upload to ChatGPT</li>
                <li>❌ Wait for resize</li>
                <li>❌ Error-prone</li>
              </ul>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'rgba(37, 244, 238, 0.05)', border: '1px solid rgba(37, 244, 238, 0.2)' }}>
              <p className="text-xs font-semibold mb-2 flex items-center gap-1" style={{ color: '#25F4EE' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                This Tool
              </p>
              <ul className="space-y-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                <li>⚡ 5 seconds per batch</li>
                <li>✅ Automatic deduplication</li>
                <li>✅ Instant resize</li>
                <li>✅ 100% accurate</li>
                <li>✅ No external tools</li>
              </ul>
            </div>
          </div>

          {/* How it works */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <h3 className="font-semibold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
              How It Works
            </h3>
            
            {/* Visual Diagram */}
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Example: 5 Cartons</p>
              
              {/* Before */}
              <div className="mb-3">
                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#FE2C55' }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  TikTok FBT PDF (10 pages)
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {[1,2,3,4,5,6,7,8,9,10].map(page => (
                    <div
                      key={page}
                      className="aspect-[4/6] rounded text-xs flex flex-col items-center justify-center p-1"
                      style={{
                        backgroundColor: page % 2 === 1 ? 'rgba(254, 44, 85, 0.1)' : 'rgba(254, 44, 85, 0.05)',
                        border: '1px solid rgba(254, 44, 85, 0.2)',
                      }}
                    >
                      <span className="font-bold" style={{ color: '#FE2C55' }}>P{page}</span>
                      <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>
                        {page % 2 === 1 ? `Label ${Math.ceil(page/2)}` : 'Duplicate'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <div className="flex justify-center my-2">
                <svg className="w-5 h-5" fill="#25F4EE" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v10.586l3.293-3.293a1 1 0 111.414 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L9 14.586V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              </div>

              {/* After */}
              <div>
                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: '#25F4EE' }}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Amazon-Compliant PDF (5 pages, 4×6")
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {[1,2,3,4,5].map(page => (
                    <div
                      key={page}
                      className="aspect-[4/6] rounded text-xs flex flex-col items-center justify-center p-1"
                      style={{
                        backgroundColor: 'rgba(37, 244, 238, 0.1)',
                        border: '1px solid rgba(37, 244, 238, 0.3)',
                      }}
                    >
                      <span className="font-bold" style={{ color: '#25F4EE' }}>P{page}</span>
                      <span className="text-[8px]" style={{ color: 'var(--text-muted)' }}>Label {page}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p>
                <strong>Processing Steps:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-1" style={{ color: 'var(--text-muted)' }}>
                <li>Keep only odd pages (1, 3, 5, 7, 9)</li>
                <li>Skip duplicate pages (2, 4, 6, 8, 10)</li>
                <li>Render each label at 3× quality for barcode clarity</li>
                <li>Resize to exact 4×6 inches</li>
                <li>Output Amazon-compliant PDF</li>
              </ol>
            </div>
          </div>

          {/* Configuration */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
            <h3 className="font-semibold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>
              Configuration Options
            </h3>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <p>
                <strong>Duplicate every N pages:</strong> Default is 2 (TikTok FBT standard). Adjust if your PDF has a different duplicate pattern.
              </p>
              <p>
                <strong>Keep offset:</strong> Which page in each group to keep. Default is 0 (first page). Use 1 if duplicates come first.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-lg font-medium text-sm transition-all"
            style={{
              background: 'linear-gradient(135deg, #25F4EE, #1AD4CE)',
              color: '#000000',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('tt-label-theme') as Theme;
    return saved || 'dark';
  });
  const [state, setState] = useState<AppState>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [pageInfo, setPageInfo] = useState<{ pageCount: number; pages: PageInfo[] } | null>(null);
  const [config, setConfig] = useState<LabelConfig | null>(null);
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [previewPage, setPreviewPage] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tt-label-theme', theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (outputUrl) URL.revokeObjectURL(outputUrl);
    };
  }, [outputUrl]);

  const toggleTheme = useCallback(() => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  }, []);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file.');
      setState('error');
      return;
    }

    try {
      setFile(selectedFile);
      setError(null);
      setState('processing');
      setProgress(10);

      const info = await getPDFInfo(selectedFile);
      setPageInfo(info);
      setProgress(50);

      const detectedConfig = detectLabelConfig(info.pages);
      setConfig(detectedConfig);
      setProgress(100);
      setState('uploaded');
    } catch (err) {
      console.error('Error reading PDF:', err);
      setError('Failed to read PDF. The file may be corrupted or unsupported.');
      setState('error');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file || !config) return;

    try {
      setState('processing');
      setProgress(0);
      setError(null);

      const processingResult = await processPDF(file, config, (p) => {
        setProgress(p);
      });

      setResult(processingResult);

      if (processingResult.labels.length > 0) {
        const { sourceWidth, sourceHeight } = config;

        const { blob } = generateOutputPDFSmart(processingResult.labels, {
          width: sourceWidth,
          height: sourceHeight,
        });

        const url = URL.createObjectURL(blob);
        setOutputUrl(url);
        setPreviewPage(0);
        setState('complete');
      } else {
        setError('No labels could be extracted from the PDF.');
        setState('error');
      }
    } catch (err) {
      console.error('Conversion error:', err);
      setError('Conversion failed. Please try again or check the file format.');
      setState('error');
    }
  }, [file, config]);

  const handleDownload = useCallback(() => {
    if (!outputUrl) return;
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `amazon-4x6-labels-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [outputUrl]);

  const handleReset = useCallback(() => {
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setState('idle');
    setFile(null);
    setPageInfo(null);
    setConfig(null);
    setResult(null);
    setProgress(0);
    setError(null);
    setOutputUrl(null);
    setShowConfig(false);
    setPreviewPage(0);
    setPreviewZoom(1);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [outputUrl]);

  const updateConfig = useCallback((updates: Partial<LabelConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  }, [config]);

  const expectedLabels = pageInfo && config
    ? config.mode === 'duplicate-pages'
      ? Math.floor(pageInfo.pageCount / config.duplicateEvery)
      : pageInfo.pageCount * config.labelsPerPage
    : 0;

  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <TikTokLogo size={36} />
            <div>
              <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: '#25F4EE' }}>TikTok</span>
                <span style={{ color: 'var(--text-muted)' }}> FBT → </span>
                <span style={{ color: '#FE2C55' }}>Amazon</span>
                <span style={{ color: 'var(--text-muted)' }}> 4×6</span>
              </h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Label Converter
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(true)}
              className="p-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isDark ? 'rgba(37, 244, 238, 0.1)' : 'rgba(37, 244, 238, 0.08)',
                color: '#25F4EE',
              }}
              aria-label="Help"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </button>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>

        {/* Main Content */}
        <div
          className="rounded-2xl p-6 animate-slide-up"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* Upload Zone */}
          {(state === 'idle' || state === 'error') && (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className="relative rounded-xl p-12 text-center cursor-pointer transition-all duration-200 overflow-hidden"
                style={{
                  border: `2px dashed ${isDragging ? '#25F4EE' : 'var(--border-color)'}`,
                  backgroundColor: isDragging
                    ? (isDark ? 'rgba(37, 244, 238, 0.05)' : 'rgba(254, 44, 85, 0.03)')
                    : 'transparent',
                }}
              >
                <div className="absolute inset-0 opacity-5 pointer-events-none">
                  <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full" style={{ backgroundColor: '#25F4EE' }} />
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full" style={{ backgroundColor: '#FE2C55' }} />
                </div>

                <div className="relative">
                  <div className="mb-4 flex justify-center">
                    <div className="relative">
                      <svg className="absolute -top-1 -left-1" width="56" height="56" viewBox="0 0 56 56" fill="none">
                        <path d="M28 8v28M16 24l12-12 12 12" stroke="#25F4EE" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <svg className="absolute top-1 left-1" width="56" height="56" viewBox="0 0 56 56" fill="none">
                        <path d="M28 8v28M16 24l12-12 12 12" stroke="#FE2C55" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                        <path d="M28 8v28M16 24l12-12 12 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-primary)' }}/>
                        <path d="M8 36v8a4 4 0 004 4h32a4 4 0 004-4v-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" style={{ color: 'var(--text-primary)' }}/>
                      </svg>
                    </div>
                  </div>
                  <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                    Drop your TikTok FBT PDF here
                  </p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    or click to browse files
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ backgroundColor: 'var(--bg-input)', color: 'var(--text-muted)' }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M2 2h5l3 3v5a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z"/>
                    </svg>
                    PDF files only
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
              </div>

              {/* Sample PDF Download */}
              <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="9" stroke="#25F4EE" strokeWidth="2"/>
                      <path d="M10 6v8M6 10l4 4 4-4" stroke="#25F4EE" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                      Need a test file?
                    </p>
                    <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                      Download a sample TikTok FBT PDF with duplicate pages to test the converter.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => downloadSamplePDF(2)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: isDark ? 'rgba(37, 244, 238, 0.1)' : 'rgba(37, 244, 238, 0.08)',
                          color: '#25F4EE',
                          border: '1px solid rgba(37, 244, 238, 0.3)',
                        }}
                      >
                        2 Labels (4 pages)
                      </button>
                      <button
                        onClick={() => downloadSamplePDF(5)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
                        style={{
                          backgroundColor: isDark ? 'rgba(254, 44, 85, 0.1)' : 'rgba(254, 44, 85, 0.08)',
                          color: '#FE2C55',
                          border: '1px solid rgba(254, 44, 85, 0.3)',
                        }}
                      >
                        5 Labels (10 pages)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Error Message */}
          {state === 'error' && error && (
            <div
              className="mt-4 p-3 rounded-lg flex items-start gap-2 animate-slide-up"
              style={{ backgroundColor: isDark ? 'rgba(254, 44, 85, 0.1)' : 'rgba(254, 44, 85, 0.05)', border: '1px solid rgba(254, 44, 85, 0.3)' }}
            >
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="#FE2C55" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-sm" style={{ color: '#FE2C55' }}>{error}</p>
            </div>
          )}

          {/* File Info & Config */}
          {(state === 'uploaded' || state === 'processing' || state === 'complete') && file && (
            <div className="space-y-4 animate-slide-up">
              {/* File info card */}
              <div
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <svg className="absolute -top-0.5 -left-0.5" width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M8 4h10l6 6v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#25F4EE" opacity="0.5"/>
                    </svg>
                    <svg className="absolute top-0.5 left-0.5" width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M8 4h10l6 6v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" fill="#FE2C55" opacity="0.5"/>
                    </svg>
                    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                      <path d="M8 4h10l6 6v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}/>
                      <path d="M18 4v6h6" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}/>
                      <text x="10" y="23" fontSize="6" fontWeight="bold" fill="#FE2C55">PDF</text>
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-sm truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>{file.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {pageInfo?.pageCount} pages detected
                      {result && ` • ${result.labelCount} labels extracted`}
                    </p>
                  </div>
                </div>
                {state === 'uploaded' && (
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md transition-colors"
                    style={{
                      color: '#25F4EE',
                      backgroundColor: isDark ? 'rgba(37, 244, 238, 0.1)' : 'rgba(37, 244, 238, 0.08)',
                    }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {showConfig ? 'Hide' : 'Configure'}
                  </button>
                )}
              </div>

              {/* Configuration Panel */}
              {showConfig && config && state === 'uploaded' && (
                <div
                  className="p-4 rounded-lg space-y-3 animate-slide-up"
                  style={{
                    backgroundColor: isDark ? 'rgba(37, 244, 238, 0.05)' : 'rgba(254, 44, 85, 0.03)',
                    border: `1px solid ${isDark ? 'rgba(37, 244, 238, 0.2)' : 'rgba(254, 44, 85, 0.15)'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="#25F4EE" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs font-medium" style={{ color: isDark ? '#25F4EE' : '#FE2C55' }}>
                      Adjust if labels are not extracted correctly
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Duplicate every</label>
                      <select
                        value={config.duplicateEvery}
                        onChange={(e) => updateConfig({ duplicateEvery: parseInt(e.target.value) })}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value={2}>2 pages (TikTok FBT)</option>
                        <option value={3}>3 pages</option>
                        <option value={4}>4 pages</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Keep page</label>
                      <select
                        value={config.keepOffset}
                        onChange={(e) => updateConfig({ keepOffset: parseInt(e.target.value) })}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value={0}>1st page (default)</option>
                        <option value={1}>2nd page</option>
                        <option value={2}>3rd page</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Source: {Math.round(config.sourceWidth)}×{Math.round(config.sourceHeight)} pts ({(config.sourceWidth / 72).toFixed(1)}×{(config.sourceHeight / 72).toFixed(1)} in)
                  </p>
                </div>
              )}

              {/* Label count info */}
              {config && state === 'uploaded' && (
                <div
                  className="p-3 rounded-lg"
                  style={{
                    backgroundColor: isDark ? 'rgba(37, 244, 238, 0.05)' : 'rgba(37, 244, 238, 0.05)',
                    border: `1px solid ${isDark ? 'rgba(37, 244, 238, 0.15)' : 'rgba(37, 244, 238, 0.2)'}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#25F4EE' }} />
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-bold" style={{ color: '#25F4EE' }}>{expectedLabels}</span>
                      <span style={{ color: 'var(--text-secondary)' }}> unique labels → 4×6 pages</span>
                    </p>
                  </div>
                  <p className="text-xs mt-1 ml-4" style={{ color: 'var(--text-muted)' }}>
                    {pageInfo!.pageCount} pages ÷ {config.duplicateEvery} duplicates = {expectedLabels} labels
                  </p>
                </div>
              )}

              {/* Processing indicator */}
              {state === 'processing' && (
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="relative w-5 h-5">
                      <div className="absolute inset-0 rounded-full" style={{ border: '2px solid #25F4EE', borderTopColor: 'transparent' }} />
                      <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '2px solid transparent', borderTopColor: '#FE2C55' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {progress < 90 ? 'Extracting labels...' : 'Generating PDF...'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300 ease-out"
                      style={{
                        width: `${progress}%`,
                        background: 'linear-gradient(90deg, #25F4EE, #FE2C55)',
                      }}
                    />
                  </div>
                  <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>{progress}%</p>
                </div>
              )}

              {/* Complete state */}
              {state === 'complete' && result && (
                <div className="space-y-4 animate-slide-up">
                  {/* Success message */}
                  <div
                    className="p-3 rounded-lg"
                    style={{
                      backgroundColor: isDark ? 'rgba(37, 244, 238, 0.08)' : 'rgba(37, 244, 238, 0.06)',
                      border: '1px solid rgba(37, 244, 238, 0.2)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 flex-shrink-0" fill="#25F4EE" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm font-medium" style={{ color: '#25F4EE' }}>
                        Conversion complete — Amazon AWD ready!
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 ml-7">
                      <div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Input</p>
                        <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{result.pageCount} pages</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Removed</p>
                        <p className="text-sm font-bold" style={{ color: '#FE2C55' }}>-{result.skippedPages} duplicates</p>
                      </div>
                      <div>
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Output</p>
                        <p className="text-sm font-bold" style={{ color: '#25F4EE' }}>{result.labelCount} labels</p>
                      </div>
                    </div>
                  </div>

                  {/* Skipped pages info */}
                  {result.skippedPages > 0 && (
                    <div
                      className="p-3 rounded-lg flex items-center gap-2"
                      style={{
                        backgroundColor: 'rgba(37, 244, 238, 0.05)',
                        border: '1px solid rgba(37, 244, 238, 0.15)',
                      }}
                    >
                      <svg className="w-4 h-4 flex-shrink-0" fill="#25F4EE" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Removed {result.skippedPages} duplicate page{result.skippedPages !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: 'rgba(254, 44, 85, 0.05)',
                        border: '1px solid rgba(254, 44, 85, 0.2)',
                      }}
                    >
                      {result.warnings.map((w, i) => (
                        <p key={i} className="text-sm flex items-center gap-1" style={{ color: '#FE2C55' }}>
                          <span>⚠</span> {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  {result.labels.length > 0 && (
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-color)' }}>
                      <div
                        className="px-3 py-2 flex items-center justify-between flex-wrap gap-2"
                        style={{ backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}
                      >
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                            Preview — {previewPage + 1} of {result.labels.length}
                          </p>
                          {/* Page navigation */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                              disabled={previewPage === 0}
                              className="px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-30"
                              style={{
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--bg-card)',
                              }}
                              title="Previous label"
                            >
                              ←
                            </button>
                            <button
                              onClick={() => setPreviewPage(Math.min(result.labels.length - 1, previewPage + 1))}
                              disabled={previewPage >= result.labels.length - 1}
                              className="px-2 py-0.5 text-xs rounded transition-colors disabled:opacity-30"
                              style={{
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-secondary)',
                                backgroundColor: 'var(--bg-card)',
                              }}
                              title="Next label"
                            >
                              →
                            </button>
                          </div>
                        </div>

                        {/* Zoom controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewZoom(Math.max(0.5, previewZoom - 0.25))}
                            disabled={previewZoom <= 0.5}
                            className="px-1.5 py-0.5 text-xs rounded transition-colors disabled:opacity-30 flex items-center gap-0.5"
                            style={{
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--bg-card)',
                            }}
                            title="Zoom out"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                            </svg>
                          </button>
                          <span
                            className="text-xs font-mono min-w-[3rem] text-center px-1 py-0.5 rounded"
                            style={{
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-color)',
                            }}
                          >
                            {Math.round(previewZoom * 100)}%
                          </span>
                          <button
                            onClick={() => setPreviewZoom(Math.min(3, previewZoom + 0.25))}
                            disabled={previewZoom >= 3}
                            className="px-1.5 py-0.5 text-xs rounded transition-colors disabled:opacity-30 flex items-center gap-0.5"
                            style={{
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--bg-card)',
                            }}
                            title="Zoom in"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setPreviewZoom(1)}
                            disabled={previewZoom === 1}
                            className="px-1.5 py-0.5 text-xs rounded transition-colors disabled:opacity-30"
                            style={{
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-secondary)',
                              backgroundColor: 'var(--bg-card)',
                            }}
                            title="Reset zoom"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Preview area - scrollable when zoomed */}
                      <div
                        className="p-4 flex justify-center overflow-auto"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          maxHeight: '500px',
                        }}
                      >
                        <div
                          className="relative transition-transform duration-200 ease-out"
                          style={{
                            transform: `scale(${previewZoom})`,
                            transformOrigin: 'top center',
                            marginBottom: previewZoom > 1 ? `${(previewZoom - 1) * 100}%` : '0',
                          }}
                        >
                          <div
                            className="shadow-lg"
                            style={{
                              width: '240px',
                              aspectRatio: '4/6',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'white',
                            }}
                          >
                            <img
                              src={result.labels[previewPage]}
                              alt={`Label ${previewPage + 1}`}
                              className="w-full h-full object-contain"
                              style={{ imageRendering: previewZoom > 1.5 ? 'pixelated' : 'auto' }}
                            />
                          </div>
                          {previewZoom === 1 && (
                            <div className="flex items-center justify-center gap-1 mt-2">
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#25F4EE' }} />
                              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>4 × 6 inches</p>
                              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FE2C55' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 relative py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 overflow-hidden group"
                      style={{
                        background: 'linear-gradient(135deg, #25F4EE, #1AD4CE)',
                        color: '#000000',
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download 4×6 PDF
                      </span>
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200"
                      style={{
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-secondary)',
                        backgroundColor: 'var(--bg-input)',
                      }}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              )}

              {/* Convert button */}
              {state === 'uploaded' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleConvert}
                    className="flex-1 relative py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, #FE2C55, #FF4D73)',
                      color: '#FFFFFF',
                    }}
                  >
                    <span className="relative z-10 flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Convert Labels
                    </span>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200"
                    style={{
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--bg-input)',
                    }}
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-1">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            🔒 All processing happens locally in your browser. No files are uploaded to any server.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Output: exact 4 × 6 inch pages — ready for Amazon AWD.
          </p>
        </div>
      </div>

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} isDark={isDark} />
    </div>
  );
}

export default App;
