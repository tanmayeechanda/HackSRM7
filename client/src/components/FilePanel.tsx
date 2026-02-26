import { FileText, X, Loader2, Hash, AlertCircle, Zap } from "lucide-react";
import type { FileEntry, AnalyzedFile } from "../hooks/useMultiFileAnalyzer";

// ── FileChip ──────────────────────────────────────────────────────────────────
interface FileChipProps {
  entry: FileEntry;
  onRemove: (id: string) => void;
}

function FileChip({ entry, onRemove }: FileChipProps) {
  const { file, analysis, id } = entry;
  const { analyzing, language, sizeError, fetchError } = analysis;
  const hasError = !!(sizeError || fetchError);

  return (
    <div
      className={`fp-chip${hasError ? " fp-chip--error" : ""}`}
      title={hasError ? (sizeError || fetchError || "") : file.name}
    >
      {analyzing ? (
        <Loader2 size={12} className="fp-chip-spinner" />
      ) : hasError ? (
        <AlertCircle size={12} className="fp-chip-error-icon" />
      ) : (
        <FileText size={12} className="fp-chip-icon" />
      )}
      <span className="fp-chip-name">{file.name}</span>
      {language && !analyzing && !hasError && (
        <span className="fp-chip-lang">{language}</span>
      )}
      <button
        className="fp-chip-remove"
        onClick={() => onRemove(id)}
        type="button"
        aria-label={`Remove ${file.name}`}
      >
        <X size={11} />
      </button>
    </div>
  );
}

// ── FilePanel (inline tray) ───────────────────────────────────────────────────
export interface FilePanelProps {
  entries: FileEntry[];
  resolvedFiles: AnalyzedFile[];
  onRemove: (id: string) => void;
  onCompress: () => void;
  compressing: boolean;
  hasCompressResults: boolean;
}

export default function FilePanel({
  entries,
  resolvedFiles,
  onRemove,
  onCompress,
  compressing,
  hasCompressResults,
}: FilePanelProps) {
  if (entries.length === 0) return null;

  const totalTokens = resolvedFiles.reduce((sum, f) => sum + f.tokenEstimate, 0);
  const hasResolved = resolvedFiles.length > 0;

  return (
    <div className="fp-tray">
      <div className="fp-tray-chips">
        {entries.map((entry) => (
          <FileChip key={entry.id} entry={entry} onRemove={onRemove} />
        ))}
      </div>

      {hasResolved && (
        <div className="fp-tray-footer">
          <span className="fp-tray-tokens">
            <Hash size={11} />
            {totalTokens.toLocaleString()} tokens
          </span>
          <button
            className={`fp-compress-btn${
              compressing ? " fp-compress-btn--loading" : ""
            }${hasCompressResults ? " fp-compress-btn--done" : ""}`}
            onClick={onCompress}
            disabled={compressing}
            type="button"
          >
            {compressing ? (
              <><Loader2 size={13} className="fc-spinner" /> Compressing…</>
            ) : hasCompressResults ? (
              <><Zap size={13} /> Re-Compress</>
            ) : (
              <><Zap size={13} /> Compress &amp; Export</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
