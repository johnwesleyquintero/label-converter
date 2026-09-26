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

type AppState = 'idle' | 'uploaded' | 'processing' | 'complete' | 'error';

function App() {
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
    };
  }, [outputUrl]);

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
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
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
        // Calculate label dimensions based on config
        const { sourceWidth, sourceHeight, labelsPerPage, layout } = config;
        let labelW: number;
        let labelH: number;

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
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [outputUrl]);

  const updateConfig = useCallback((updates: Partial<LabelConfig>) => {
    if (!config) return;
    setConfig({ ...config, ...updates });
  }, [config]);

  const totalExpectedLabels = pageInfo && config ? pageInfo.pageCount * config.labelsPerPage : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            TikTok FBT → Amazon 4×6 Label Converter
          </h1>
          <p className="text-gray-600 text-sm">
            Convert TikTok FBT duplicate-label PDFs into 4×6 shipping labels.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {/* Upload Zone */}
          {(state === 'idle' || state === 'error') && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <div className="text-gray-400 mb-4">
                <svg className="w-14 h-14 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-gray-700 font-medium mb-1">
                Drop your TikTok FBT PDF here
              </p>
              <p className="text-gray-500 text-sm">
                or click to browse files
              </p>
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
          )}

          {/* Error Message */}
          {state === 'error' && error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* File Info & Config */}
          {(state === 'uploaded' || state === 'processing' || state === 'complete') && file && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="text-red-500 flex-shrink-0">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">{file.name}</p>
                    <p className="text-gray-500 text-xs">
                      {pageInfo?.pageCount} page{pageInfo?.pageCount !== 1 ? 's' : ''} detected
                      {result && ` • ${result.labelCount} label${result.labelCount !== 1 ? 's' : ''} extracted`}
                    </p>
                  </div>
                </div>
                {state === 'uploaded' && (
                  <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
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
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-md space-y-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-amber-800 font-medium">
                      Adjust if labels are cut off or misaligned
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Labels per page</label>
                      <select
                        value={config.labelsPerPage}
                        onChange={(e) => updateConfig({ labelsPerPage: parseInt(e.target.value) })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value={1}>1 label (full page)</option>
                        <option value={2}>2 labels</option>
                        <option value={3}>3 labels</option>
                        <option value={4}>4 labels</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Layout direction</label>
                      <select
                        value={config.layout}
                        onChange={(e) => updateConfig({ layout: e.target.value as 'vertical' | 'horizontal' })}
                        className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="vertical">Vertical (stacked top↕bottom)</option>
                        <option value="horizontal">Horizontal (side by side ↔)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Source page: {Math.round(config.sourceWidth)}×{Math.round(config.sourceHeight)} pts ({(config.sourceWidth / 72).toFixed(1)}×{(config.sourceHeight / 72).toFixed(1)} in)
                  </p>
                </div>
              )}

              {/* Label count info */}
              {config && state === 'uploaded' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-semibold">{totalExpectedLabels} label{totalExpectedLabels !== 1 ? 's' : ''}</span>
                    <span className="text-blue-600 ml-2">
                      will be placed on individual 4×6 inch pages
                    </span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {config.labelsPerPage} label{config.labelsPerPage !== 1 ? 's' : ''}/page × {pageInfo!.pageCount} source page{pageInfo!.pageCount !== 1 ? 's' : ''} = {totalExpectedLabels} output pages
                  </p>
                </div>
              )}

              {/* Processing indicator */}
              {state === 'processing' && (
                <div className="space-y-3 py-4">
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                    <span className="text-sm text-gray-700">
                      {progress < 100 ? 'Extracting labels from PDF...' : 'Generating output PDF...'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-right">{progress}%</p>
                </div>
              )}

              {/* Complete state */}
              {state === 'complete' && result && (
                <div className="space-y-4">
                  {/* Success message */}
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-green-800 font-medium">
                      Conversion complete — {result.labelCount} label{result.labelCount !== 1 ? 's' : ''} generated.
                    </p>
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      {result.warnings.map((w, i) => (
                        <p key={i} className="text-sm text-yellow-800 flex items-center gap-1">
                          <span>⚠</span> {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Preview */}
                  {result.labels.length > 0 && (
                    <div className="border border-gray-200 rounded-md overflow-hidden">
                      <div className="bg-gray-100 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-600">
                          Label Preview ({previewPage + 1} of {result.labels.length})
                        </p>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreviewPage(Math.max(0, previewPage - 1))}
                            disabled={previewPage === 0}
                            className="px-2 py-0.5 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-200 disabled:hover:bg-transparent"
                          >
                            ← Prev
                          </button>
                          <button
                            onClick={() => setPreviewPage(Math.min(result.labels.length - 1, previewPage + 1))}
                            disabled={previewPage >= result.labels.length - 1}
                            className="px-2 py-0.5 text-xs border border-gray-300 rounded disabled:opacity-40 hover:bg-gray-200 disabled:hover:bg-transparent"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                      <div className="p-4 flex justify-center bg-gray-50 min-h-[300px]">
                        <div className="relative" style={{ maxWidth: '280px' }}>
                          <div className="border border-gray-300 shadow-sm bg-white" style={{ aspectRatio: '4/6' }}>
                            <img
                              src={result.labels[previewPage]}
                              alt={`Label ${previewPage + 1}`}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <p className="text-center text-xs text-gray-400 mt-2">4 × 6 inches</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleDownload}
                      className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download 4×6 PDF
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm"
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
                    className="flex-1 bg-blue-600 text-white py-2.5 px-4 rounded-md font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm"
                  >
                    Convert Labels
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 active:bg-gray-100 transition-colors text-sm"
                  >
                    Reset
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400 space-y-1">
          <p>All processing happens locally in your browser. No files are uploaded to any server.</p>
          <p>Output PDF pages are exactly 4 × 6 inches — suitable for label printers.</p>
        </div>
      </div>
    </div>
  );
}

export default App;
