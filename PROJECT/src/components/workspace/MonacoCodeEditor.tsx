import React, { useState, useRef, useEffect } from 'react';
import Editor, { type OnMount, type Monaco } from '@monaco-editor/react';
import { useJudge } from '../../context/JudgeContext';
import type { SupportedLanguage } from '../../types/judge';
import { 
  RotateCcw, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  ChevronDown, 
  AlertCircle
} from 'lucide-react';

interface Props {
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  code: string;
  onCodeChange: (newCode: string) => void;
  onResetCode: () => void;
}

const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; monacoLang: string; version: string }> = {
  cpp: { label: 'C++', monacoLang: 'cpp', version: 'GCC 13' },
  python: { label: 'Python 3', monacoLang: 'python', version: 'Python 3.12' },
  java: { label: 'Java', monacoLang: 'java', version: 'OpenJDK 21' },
  javascript: { label: 'JavaScript', monacoLang: 'javascript', version: 'Node.js 20' },
};

export const MonacoCodeEditor: React.FC<Props> = ({
  language,
  onLanguageChange,
  code,
  onCodeChange,
  onResetCode,
}) => {
  const { theme } = useJudge();
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(13);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const editorRef = useRef<any>(null);

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
  };

  const handleBeforeMount = (monaco: Monaco) => {
    monaco.editor.defineTheme('algoflow-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '68665E', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'F87171', fontStyle: 'bold' },
        { token: 'string', foreground: '62D6C5' },
        { token: 'number', foreground: 'FBBF24' },
        { token: 'type', foreground: '62D6C5' },
        { token: 'function', foreground: 'F2F0E9' },
        { token: 'identifier', foreground: 'F2F0E9' },
      ],
      colors: {
        'editor.background': '#090A0C',
        'editor.foreground': '#F2F0E9',
        'editor.lineHighlightBackground': '#101216',
        'editorLineNumber.foreground': '#45433D',
        'editorLineNumber.activeForeground': '#62D6C5',
        'editorCursor.foreground': '#62D6C5',
        'editor.selectionBackground': '#62D6C533',
        'editorGutter.background': '#090A0C',
        'scrollbarSlider.background': '#191C2180',
        'scrollbarSlider.hoverBackground': '#2A2F38',
        'editorIndentGuide.background1': '#191C21',
        'editorIndentGuide.activeBackground1': '#62D6C550',
      },
    });

    monaco.editor.defineTheme('algoflow-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '94a3b8', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'e11d48', fontStyle: 'bold' },
        { token: 'string', foreground: '059669' },
        { token: 'number', foreground: 'd97706' },
        { token: 'type', foreground: '059669' },
        { token: 'function', foreground: '0f172a' },
        { token: 'identifier', foreground: '0f172a' },
      ],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#0f172a',
        'editor.lineHighlightBackground': '#f8fafc',
        'editorLineNumber.foreground': '#94a3b8',
        'editorLineNumber.activeForeground': '#059669',
        'editorCursor.foreground': '#059669',
        'editor.selectionBackground': '#05966930',
        'editorGutter.background': '#ffffff',
        'scrollbarSlider.background': '#cbd5e160',
        'scrollbarSlider.hoverBackground': '#94a3b8',
      },
    });
  };

  // Re-layout editor on resize
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        editorRef.current.layout();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirmReset = () => {
    onResetCode();
    setShowResetConfirm(false);
  };

  const currentLangConfig = LANGUAGE_LABELS[language];

  return (
    <div className={`flex flex-col bg-[var(--obsidian)] text-[var(--bone)] overflow-hidden font-sans ${
      isFullscreen ? 'fixed inset-2 z-50 rounded-[var(--r-lg)] shadow-[var(--shadow-lg)] border border-[var(--border-strong)]' : 'h-full'
    }`}>
      
      {/* Top Toolbar */}
      <div className="h-9 flex items-center justify-between border-b border-[var(--border)] bg-[var(--carbon)] px-3 shrink-0 select-none font-mono">
        
        {/* Left: Language Selector */}
        <div className="relative">
          <button
            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-[var(--r-sm)] bg-[var(--ash)] border border-[var(--border)] hover:border-[var(--border-strong)] text-xs font-medium text-[var(--bone)] transition-colors"
          >
            <span>{currentLangConfig.label}</span>
            <span className="text-[10px] text-[var(--text-3)] hidden sm:inline">({currentLangConfig.version})</span>
            <ChevronDown className="w-3 h-3 text-[var(--text-3)] ml-0.5" />
          </button>

          {isLangDropdownOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsLangDropdownOpen(false)} 
              />
              <div className="absolute left-0 mt-1 w-48 rounded-[var(--r-md)] bg-[var(--ash)] border border-[var(--border)] py-1 z-50 text-xs shadow-[var(--shadow-md)]">
                {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map(langKey => {
                  const info = LANGUAGE_LABELS[langKey];
                  const isSelected = langKey === language;
                  return (
                    <button
                      key={langKey}
                      onClick={() => {
                        onLanguageChange(langKey);
                        setIsLangDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-left transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-[var(--accent-dim)] text-[var(--verdigris)] font-semibold' 
                          : 'text-[var(--text-2)] hover:bg-[var(--bg-hover)] hover:text-[var(--bone)]'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span>{info.label}</span>
                        <span className="text-[10px] text-[var(--text-3)]">{info.version}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[var(--verdigris)]" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right: Actions (Font size, Reset, Copy, Fullscreen) */}
        <div className="flex items-center gap-1 text-[var(--text-3)] text-xs">
          
          {/* Font Size Toggle */}
          <button
            onClick={() => setFontSize(prev => (prev === 13 ? 14 : prev === 14 ? 12 : 13))}
            title="Font Size (12px / 13px / 14px)"
            className="px-2 py-0.5 rounded-[var(--r-sm)] hover:bg-[var(--ash)] hover:text-[var(--bone)] transition-colors"
          >
            {fontSize}px
          </button>

          {/* Reset Code Confirmation */}
          {showResetConfirm ? (
            <div className="flex items-center gap-1 bg-[var(--amber-dim)] border border-[var(--amber)]/40 px-2 py-0.5 rounded-[var(--r-sm)] text-[11px]">
              <AlertCircle className="w-3 h-3 text-[var(--amber)]" />
              <span className="text-[var(--bone)] font-sans">Reset?</span>
              <button
                onClick={handleConfirmReset}
                className="font-semibold text-[var(--amber)] hover:underline ml-1 cursor-pointer"
              >
                Yes
              </button>
              <button
                onClick={() => setShowResetConfirm(false)}
                className="text-[var(--text-3)] hover:underline ml-1 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowResetConfirm(true)}
              title="Reset starter template"
              className="p-1 rounded hover:bg-[var(--ash)] hover:text-[var(--bone)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Copy Code */}
          <button
            onClick={handleCopy}
            title={copied ? 'Copied!' : 'Copy Code'}
            className="p-1 rounded hover:bg-[var(--ash)] hover:text-[var(--bone)] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--verdigris)]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen Editor */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
            className="p-1 rounded hover:bg-[var(--ash)] hover:text-[var(--bone)] transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Monaco Editor Canvas */}
      <div className="flex-1 min-h-0 bg-[var(--obsidian)]">
        <Editor
          height="100%"
          language={currentLangConfig.monacoLang}
          value={code}
          onChange={(val) => onCodeChange(val || '')}
          beforeMount={handleBeforeMount}
          onMount={handleEditorDidMount}
          theme={theme === 'dark' ? 'algoflow-dark' : 'algoflow-light'}
          options={{
            fontSize: fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
            fontLigatures: true,
            minimap: { enabled: false },
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            padding: { top: 12, bottom: 12 },
            lineHeight: 21,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            renderLineHighlight: 'all',
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
            },
          }}
        />
      </div>

    </div>
  );
};
