/**
 * usePipeline
 * ───────────
 * Drives all four export pipelines:
 *
 *  • raw           — plain-text, no compression
 *  • compressed    — TokenTrim compression + decode preamble (legacy)
 *  • no-extension  — same compression, with full LLM decode instructions
 *  • with-extension — lossless JSON payload, no preamble (extension decodes)
 */

import { useState, useCallback } from "react";
import type { Message } from "../components/ChatArea";
import type { FileEntry } from "./useMultiFileAnalyzer";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PipelineMode = "raw" | "compressed" | "no-extension" | "with-extension";

export interface PipelineState {
  running: PipelineMode | null;
  error: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000";

const ENDPOINT: Record<PipelineMode, string> = {
  "raw":            "/pipeline/raw",
  "compressed":     "/pipeline/compressed",
  "no-extension":   "/pipeline/no-extension",
  "with-extension": "/pipeline/with-extension",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function messagesToTranscript(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      return `[${role}]\n${m.content}`;
    })
    .join("\n\n");
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function bundleFilename(mode: PipelineMode): string {
  const ts = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:.]/g, "-");
  const ext = mode === "with-extension" ? "txt" : "txt";
  return `tokentrim-${mode}-${ts}.${ext}`;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function usePipeline() {
  const [state, setState] = useState<PipelineState>({ running: null, error: null });

  const _run = useCallback(
    async (
      mode: PipelineMode,
      messages: Message[],
      fileEntries: FileEntry[],
    ) => {
      setState({ running: mode, error: null });

      try {
        const chat = messagesToTranscript(messages);
        const form = new FormData();
        form.append("chat", chat);

        const validEntries = fileEntries.filter(
          (e) => !e.analysis.sizeError && !e.analysis.fetchError && !e.analysis.analyzing,
        );
        for (const entry of validEntries) {
          form.append("files", entry.file);
        }

        const res = await fetch(`${API_BASE}${ENDPOINT[mode]}`, {
          method: "POST",
          body: form,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(
            (body as { detail?: string }).detail ?? `HTTP ${res.status}`,
          );
        }

        const text = await res.text();
        downloadText(text, bundleFilename(mode));
        setState({ running: null, error: null });
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message !== "Failed to fetch"
            ? err.message
            : "Could not reach the backend. Make sure the server is running on port 8000.";
        console.error(`[usePipeline] ${mode}:`, err);
        setState({ running: null, error: message });
      }
    },
    [],
  );

  const exportRaw = useCallback(
    (messages: Message[], fileEntries: FileEntry[]) => _run("raw", messages, fileEntries),
    [_run],
  );

  const exportCompressed = useCallback(
    (messages: Message[], fileEntries: FileEntry[]) => _run("compressed", messages, fileEntries),
    [_run],
  );

  const exportNoExtension = useCallback(
    (messages: Message[], fileEntries: FileEntry[]) => _run("no-extension", messages, fileEntries),
    [_run],
  );

  const exportWithExtension = useCallback(
    (messages: Message[], fileEntries: FileEntry[]) => _run("with-extension", messages, fileEntries),
    [_run],
  );

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return {
    ...state,
    exportRaw,
    exportCompressed,
    exportNoExtension,
    exportWithExtension,
    clearError,
  };
}
