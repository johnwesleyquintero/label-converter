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
      {/* Cyan offset */}
      <g transform="translate(-6, -6)">
        <rect x="130" y="80" width="252" height="340" rx="16" fill="none" stroke="#25F4EE" strokeWidth="12"/>
        <line x1="165" y1="140" x2="347" y2="140" stroke="#25F4EE" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="180" x2="310" y2="180" stroke="#25F4EE" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="220" x2="330" y2="220" stroke="#25F4EE" strokeWidth="10" strokeLinecap="round"/>
        <rect x="165" y="280" width="182" height="80" rx="4" fill="none" stroke="#25F4EE" strokeWidth="6"/>
      </g>
      {/* Red offset */}
      <g transform="translate(6, 6)">
        <rect x="130" y="80" width="252" height="340" rx="16" fill="none" stroke="#FE2C55" strokeWidth="12"/>
        <line x1="165" y1="140" x2="347" y2="140" stroke="#FE2C55" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="180" x2="310" y2="180" stroke="#FE2C55" strokeWidth="10" strokeLinecap="round"/>
        <line x1="165" y1="220" x2="330" y2="220" stroke="#FE2C55" strokeWidth="10" strokeLinecap="round"/>
        <rect x="165" y="280" width="182" height="80" rx="4" fill="none" stroke="#FE2C55" strokeWidth="6"/>
      </g>
      {/* White main */}
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
  const [previewPage, setPreviewPage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tt-label-theme', theme);
  }, [theme]);

  // Cleanup URLs on unmount
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
        const { sourceWidth, sourceHeight, labelsPerPage, layout } = config;
        let labelW: number, labelH: number;

        if (layout === 'vertical') {
          labelW = sourceWidth;
          labelH = sourceHeight / labelsPerPage;
        } else {
          labelW = sourceWidth / labelsPerPage;
          labelH = sourceHeight;
        }

        const { blob } = generateOutputPDFSmart(processingResult.labels, {
          width: labelW,
          height: labelH,
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
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [outputUrl]);

  const updateConfig = useCallback((updates: Partial<LabelConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  }, [config]);

  const totalExpectedLabels = pageInfo && config ? pageInfo.pageCount * config.labelsPerPage : 0;
  const isDark = theme === 'dark';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <TikTokLogo size={36} />
            </div>
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
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        {/* Main Content */}
        <div
          className="rounded-2xl p-6 animate-slide-up"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: `1px solid var(--border-color)`,
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
              {/* Background gradient decoration */}
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full" style={{ backgroundColor: '#25F4EE' }} />
                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full" style={{ backgroundColor: '#FE2C55' }} />
              </div>

              <div className="relative">
                <div className="mb-4 flex justify-center">
                  <div className="relative">
                    {/* TikTok-style upload icon with dual color offset */}
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
                    Download a sample TikTok FBT PDF with 2 duplicate labels per page to test the converter.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadSamplePDF(1)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
                      style={{
                        backgroundColor: isDark ? 'rgba(37, 244, 238, 0.1)' : 'rgba(37, 244, 238, 0.08)',
                        color: '#25F4EE',
                        border: '1px solid rgba(37, 244, 238, 0.3)',
                      }}
                    >
                      1 Page (2 labels)
                    </button>
                    <button
                      onClick={() => downloadSamplePDF(3)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200"
                      style={{
                        backgroundColor: isDark ? 'rgba(254, 44, 85, 0.1)' : 'rgba(254, 44, 85, 0.08)',
                        color: '#FE2C55',
                        border: '1px solid rgba(254, 44, 85, 0.3)',
                      }}
                    >
                      3 Pages (6 labels)
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
                      {pageInfo?.pageCount} page{pageInfo?.pageCount !== 1 ? 's' : ''} detected
                      {result && ` • ${result.labelCount} label${result.labelCount !== 1 ? 's' : ''} extracted`}
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
                      Adjust if labels are cut off or misaligned
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Labels per page</label>
                      <select
                        value={config.labelsPerPage}
                        onChange={(e) => updateConfig({ labelsPerPage: parseInt(e.target.value) })}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value={1}>1 label (full page)</option>
                        <option value={2}>2 labels</option>
                        <option value={3}>3 labels</option>
                        <option value={4}>4 labels</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>Layout direction</label>
                      <select
                        value={config.layout}
                        onChange={(e) => updateConfig({ layout: e.target.value as 'vertical' | 'horizontal' })}
                        className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          border: '1px solid var(--border-color)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <option value="vertical">Vertical (stacked ↕)</option>
                        <option value="horizontal">Horizontal (side by side ↔)</option>
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
                      <span className="font-bold" style={{ color: '#25F4EE' }}>{totalExpectedLabels}</span>
                      <span style={{ color: 'var(--text-secondary)' }}> label{totalExpectedLabels !== 1 ? 's' : ''} → individual 4×6 pages</span>
                    </p>
                  </div>
                  <p className="text-xs mt-1 ml-4" style={{ color: 'var(--text-muted)' }}>
                    {config.labelsPerPage}/page × {pageInfo!.pageCount} pages = {totalExpectedLabels} output pages
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
                    className="p-3 rounded-lg flex items-center gap-2"
                    style={{
                      backgroundColor: isDark ? 'rgba(37, 244, 238, 0.08)' : 'rgba(37, 244, 238, 0.06)',
                      border: '1px solid rgba(37, 244, 238, 0.2)',
                    }}
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="#25F4EE" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium" style={{ color: '#25F4EE' }}>
                      Conversion complete — {result.labelCount} label{result.labelCount !== 1 ? 's' : ''} generated.
                    </p>
                  </div>

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
                        className="px-3 py-2 flex items-center justify-between"
                        style={{ backgroundColor: 'var(--bg-input)', borderBottom: '1px solid var(--border-color)' }}
                      >
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                          Preview — {previewPage + 1} of {result.labels.length}
                        </p>
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
                          >
                            →
                          </button>
                        </div>
                      </div>
                      <div className="p-4 flex justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                        <div className="relative" style={{ maxWidth: '240px' }}>
                          <div
                            className="shadow-lg"
                            style={{
                              aspectRatio: '4/6',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'white',
                            }}
                          >
                            <img
                              src={result.labels[previewPage]}
                              alt={`Label ${previewPage + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#25F4EE' }} />
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>4 × 6 inches</p>
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FE2C55' }} />
                          </div>
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
            Output: exact 4 × 6 inch pages — ready for label printers.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
