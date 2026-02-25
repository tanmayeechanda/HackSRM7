/**
 * usePipeline
 * ───────────
 * Drives the two export pipelines (raw and compressed).
 * Each call hits the backend, receives a plain-text bundle,
 * and triggers a browser download of the resulting .txt file.
 */

import { useState, useCallback } from "react";
import type { Message } from "../components/ChatArea";
import type { FileEntry } from "./useMultiFileAnalyzer";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PipelineMode = "raw" | "compressed";

export interface PipelineState {
  /** Which pipeline is currently running (null = idle). */
  running: PipelineMode | null;
  error: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = "http://localhost:8000";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Convert the message array into a readable transcript string. */
function messagesToTranscript(messages: Message[]): string {
  return messages
    .map((m) => {
      const role = m.role === "user" ? "User" : "Assistant";
      return `[${role}]\n${m.content}`;
    })
    .join("\n\n");
}

/** Trigger a browser download of a text blob. */
function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain; charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Build a timestamped file name like `tokentrim-raw-2026-02-25T14-32.txt`. */
function bundleFilename(mode: PipelineMode): string {
  const ts = new Date()
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:.]/g, "-");
  return `tokentrim-${mode}-${ts}.txt`;
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

        // Append only fully-analyzed, error-free files
        const validEntries = fileEntries.filter(
          (e) =>
            !e.analysis.sizeError &&
            !e.analysis.fetchError &&
            !e.analysis.analyzing,
        );

        for (const entry of validEntries) {
          form.append("files", entry.file);
        }

        const endpoint =
          mode === "raw" ? "/pipeline/raw" : "/pipeline/compressed";

        const res = await fetch(`${API_BASE}${endpoint}`, {
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
    (messages: Message[], fileEntries: FileEntry[]) =>
      _run("raw", messages, fileEntries),
    [_run],
  );

  const exportCompressed = useCallback(
    (messages: Message[], fileEntries: FileEntry[]) =>
      _run("compressed", messages, fileEntries),
    [_run],
  );

  const clearError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return {
    ...state,
    exportRaw,
    exportCompressed,
    clearError,
  };
}
