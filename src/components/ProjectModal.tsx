"use client";

import { FormEvent, useEffect, useState } from "react";
import { X } from "lucide-react";
import { ScheduleInterval } from "@prisma/client";
import { SCHEDULE_LABELS } from "@/lib/schedule";
import type { ProjectFormValues } from "@/lib/types";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initial?: ProjectFormValues;
  onClose: () => void;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
};

const EMPTY: ProjectFormValues = {
  name: "",
  searchQuery: "",
  locationsText: "",
  schedule: "NONE",
};

export function ProjectModal({ open, mode, initial, onClose, onSubmit }: Props) {
  const [values, setValues] = useState<ProjectFormValues>(initial || EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setValues(initial || EMPTY);
      setError(null);
      setSaving(false);
    }
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close overlay"
        className="absolute inset-0 bg-[rgba(15,15,15,0.4)] backdrop-blur-[2px] animate-[fadeIn_0.15s_ease]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-[520px] rounded-[6px] border border-[rgba(55,53,47,0.16)] bg-white shadow-[0_12px_48px_rgba(15,15,15,0.18)] animate-[modalIn_0.18s_ease]"
      >
        <div className="flex items-center justify-between border-b border-[rgba(55,53,47,0.09)] px-4 py-3">
          <h2 className="text-[15px] font-semibold text-[#37352f]">
            {mode === "create" ? "New project" : "Project settings"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[rgba(55,53,47,0.45)] hover:bg-[rgba(55,53,47,0.08)]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
          <Field label="Project name">
            <input
              required
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Metro Manila cafes"
              className="notion-input"
            />
          </Field>

          <Field
            label="What to look for"
            hint="OSM amenity/shop key or name keywords — e.g. cafe, pharmacy, restaurant"
          >
            <input
              required
              value={values.searchQuery}
              onChange={(e) =>
                setValues((v) => ({ ...v, searchQuery: e.target.value }))
              }
              placeholder="cafe"
              className="notion-input"
            />
          </Field>

          <Field
            label="Locations / addresses"
            hint="One address or area per line"
          >
            <textarea
              required
              rows={6}
              value={values.locationsText}
              onChange={(e) =>
                setValues((v) => ({ ...v, locationsText: e.target.value }))
              }
              placeholder={"Makati City, Philippines\nQuezon City, Philippines"}
              className="notion-input resize-y font-mono text-[13px] leading-relaxed"
            />
          </Field>

          <Field label="Schedule auto-scrape">
            <select
              value={values.schedule}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  schedule: e.target.value as ScheduleInterval,
                }))
              }
              className="notion-input"
            >
              {(Object.keys(SCHEDULE_LABELS) as ScheduleInterval[]).map((key) => (
                <option key={key} value={key}>
                  {SCHEDULE_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>

          {error && (
            <p className="rounded-[4px] bg-[rgba(212,76,71,0.1)] px-3 py-2 text-[13px] text-[#d44c47]">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 border-t border-[rgba(55,53,47,0.09)] pt-3">
            <button
              type="button"
              onClick={onClose}
              className="notion-btn-ghost"
              disabled={saving}
            >
              Cancel
            </button>
            <button type="submit" className="notion-btn-primary" disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create project" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[rgba(55,53,47,0.65)]">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1 block text-[11px] text-[rgba(55,53,47,0.4)]">
          {hint}
        </span>
      )}
    </label>
  );
}
