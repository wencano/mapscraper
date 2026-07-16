"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { ArrowLeft, Play, Settings, Trash2 } from "lucide-react";
import { ProjectModal } from "@/components/ProjectModal";
import { StatusBadge } from "@/components/StatusBadge";
import { ProgressBar } from "@/components/ProgressBar";
import { LeadsTable } from "@/components/LeadsTable";
import { SCHEDULE_LABELS } from "@/lib/schedule";
import type { ProjectFormValues, ProjectWithLeads } from "@/lib/types";

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [project, setProject] = useState<ProjectWithLeads | null>(null);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) {
      setError("Project not found");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setProject(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll while scraping
  useEffect(() => {
    if (!project || project.status !== "SCRAPING") return;
    const t = window.setInterval(async () => {
      const res = await fetch(`/api/projects/${id}/status`);
      if (!res.ok) return;
      const status = await res.json();
      if (status.status !== "SCRAPING") {
        await load();
        return;
      }
      setProject((prev) =>
        prev
          ? {
              ...prev,
              status: status.status,
              progressCurrent: status.progressCurrent,
              progressTotal: status.progressTotal,
              errorMessage: status.errorMessage,
            }
          : prev
      );
    }, 1500);
    return () => window.clearInterval(t);
  }, [project?.status, id, load]);

  const formInitial: ProjectFormValues | undefined = useMemo(() => {
    if (!project) return undefined;
    return {
      name: project.name,
      searchQuery: project.searchQuery,
      locationsText: project.locations.join("\n"),
      schedule: project.schedule,
    };
  }, [project]);

  async function handleSave(values: ProjectFormValues) {
    const res = await fetch(`/api/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Update failed");
    setSettingsOpen(false);
    await load();
  }

  async function handleScrape() {
    setStarting(true);
    setError(null);
    const res = await fetch(`/api/projects/${id}/scrape`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setStarting(false);
    if (!res.ok) {
      setError(data.error || "Could not start scrape");
      return;
    }
    await load();
  }

  async function handleDelete() {
    if (!confirm("Delete this project and all leads?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    router.push("/");
  }

  if (loading) {
    return (
      <p className="text-[13px] text-[rgba(55,53,47,0.45)]">Loading project…</p>
    );
  }

  if (!project) {
    return (
      <div>
        <p className="text-[14px] text-[#d44c47]">{error || "Not found"}</p>
        <button type="button" className="notion-btn-ghost mt-3" onClick={() => router.push("/")}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  const canRun =
    (project.status === "READY" ||
      project.status === "DONE" ||
      project.status === "ERROR") &&
    !starting;

  return (
    <div className="space-y-4">
      <button
        type="button"
        className="notion-btn-ghost -ml-2"
        onClick={() => router.push("/")}
      >
        <ArrowLeft size={14} />
        Projects
      </button>

      <div className="rounded-[8px] border border-[rgba(55,53,47,0.09)] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[rgba(55,53,47,0.09)] px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-[#37352f]">
                {project.name}
              </h1>
              <StatusBadge status={project.status} />
            </div>
            <p className="mt-1 text-[13px] text-[rgba(55,53,47,0.55)]">
              Looking for{" "}
              <span className="font-medium text-[#37352f]">{project.searchQuery}</span>
              {" · "}
              {project.locations.length} location
              {project.locations.length === 1 ? "" : "s"}
              {" · "}
              {SCHEDULE_LABELS[project.schedule]}
            </p>
            {project.lastScrapedAt && (
              <p className="mt-1 text-[11px] text-[rgba(55,53,47,0.4)]">
                Last scrape{" "}
                {formatDistanceToNow(new Date(project.lastScrapedAt), {
                  addSuffix: true,
                })}{" "}
                ({format(new Date(project.lastScrapedAt), "MMM d, yyyy HH:mm")})
              </p>
            )}
            {project.nextRunAt && project.schedule !== "NONE" && (
              <p className="mt-0.5 text-[11px] text-[rgba(55,53,47,0.4)]">
                Next auto-scrape{" "}
                {formatDistanceToNow(new Date(project.nextRunAt), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="notion-btn-secondary"
              onClick={() => setSettingsOpen(true)}
              title="Project settings"
            >
              <Settings size={15} />
              Settings
            </button>
            <button
              type="button"
              className="notion-btn-ghost text-[#d44c47] hover:bg-[rgba(212,76,71,0.08)]"
              onClick={handleDelete}
              title="Delete project"
            >
              <Trash2 size={15} />
            </button>
            <button
              type="button"
              className="notion-btn-primary"
              disabled={!canRun}
              onClick={handleScrape}
            >
              <Play size={14} />
              {project.status === "SCRAPING"
                ? "Scraping…"
                : project.status === "DONE"
                  ? "Re-scrape"
                  : "Run scrape"}
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 py-4">
          {project.status === "READY" && (
            <div className="rounded-[4px] bg-[rgba(15,123,108,0.08)] px-3 py-2 text-[13px] text-[#0f7b6c]">
              Ready to run — scrape will geocode each location and query Overpass for{" "}
              <strong>{project.searchQuery}</strong>.
            </div>
          )}

          {project.status === "SCRAPING" && (
            <ProgressBar
              current={project.progressCurrent}
              total={project.progressTotal}
            />
          )}

          {project.status === "ERROR" && project.errorMessage && (
            <div className="rounded-[4px] bg-[rgba(212,76,71,0.1)] px-3 py-2 text-[13px] text-[#d44c47]">
              {project.errorMessage}
            </div>
          )}

          {error && (
            <div className="rounded-[4px] bg-[rgba(212,76,71,0.1)] px-3 py-2 text-[13px] text-[#d44c47]">
              {error}
            </div>
          )}

          <div>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold text-[#37352f]">Leads</h2>
              <span className="text-[12px] text-[rgba(55,53,47,0.45)]">
                {project.leads.length} item{project.leads.length === 1 ? "" : "s"}
              </span>
            </div>
            <LeadsTable leads={project.leads} />
          </div>

          <details className="rounded-[4px] border border-[rgba(55,53,47,0.09)] bg-[#fbfbfa] px-3 py-2">
            <summary className="cursor-pointer text-[12px] font-medium text-[rgba(55,53,47,0.65)]">
              Locations ({project.locations.length})
            </summary>
            <ul className="mt-2 space-y-1 pb-1 text-[12px] text-[rgba(55,53,47,0.65)]">
              {project.locations.map((loc) => (
                <li key={loc} className="font-mono">
                  {loc}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>

      <ProjectModal
        open={settingsOpen}
        mode="edit"
        initial={formInitial}
        onClose={() => setSettingsOpen(false)}
        onSubmit={handleSave}
      />
    </div>
  );
}
