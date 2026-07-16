"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Plus, MapPin, Building2, Clock } from "lucide-react";
import { ProjectModal } from "@/components/ProjectModal";
import { StatusBadge } from "@/components/StatusBadge";
import { SCHEDULE_LABELS } from "@/lib/schedule";
import type { ProjectFormValues, ProjectWithCount } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data = await res.json();
    setProjects(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(values: ProjectFormValues) {
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to create");
    setModalOpen(false);
    router.push(`/projects/${data.id}`);
  }

  return (
    <div className="rounded-[8px] border border-[rgba(55,53,47,0.09)] bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(55,53,47,0.09)] px-5 py-4">
        <div>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em] text-[#37352f]">
            Projects
          </h1>
          <p className="mt-0.5 text-[13px] text-[rgba(55,53,47,0.5)]">
            Areas and campaigns for map-based lead scraping
          </p>
        </div>
        <button
          type="button"
          className="notion-btn-primary"
          onClick={() => setModalOpen(true)}
        >
          <Plus size={15} />
          New project
        </button>
      </div>

      <div className="p-4 sm:p-5">
        {loading ? (
          <p className="py-10 text-center text-[13px] text-[rgba(55,53,47,0.45)]">
            Loading…
          </p>
        ) : projects.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(55,53,47,0.06)] text-[rgba(55,53,47,0.45)]">
              <MapPin size={18} />
            </div>
            <p className="text-[14px] font-medium text-[#37352f]">No projects yet</p>
            <p className="mt-1 text-[13px] text-[rgba(55,53,47,0.5)]">
              Create a project with a search intent and a list of addresses.
            </p>
            <button
              type="button"
              className="notion-btn-primary mt-4"
              onClick={() => setModalOpen(true)}
            >
              <Plus size={15} />
              New project
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => router.push(`/projects/${p.id}`)}
                  className="flex h-full w-full flex-col rounded-[8px] border border-[rgba(55,53,47,0.09)] bg-[#fbfbfa] p-4 text-left transition-all hover:border-[rgba(55,53,47,0.18)] hover:bg-white hover:shadow-[0_2px_8px_rgba(15,15,15,0.06)]"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[rgba(35,131,226,0.1)] text-[#2383e2]">
                      <MapPin size={16} />
                    </div>
                    <StatusBadge status={p.status} />
                  </div>

                  <h2 className="line-clamp-2 text-[15px] font-semibold tracking-[-0.01em] text-[#37352f]">
                    {p.name}
                  </h2>
                  <p className="mt-1 text-[12px] text-[rgba(55,53,47,0.55)]">
                    Looking for{" "}
                    <span className="font-medium text-[#37352f]">{p.searchQuery}</span>
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-[rgba(55,53,47,0.55)]">
                    <span className="inline-flex items-center gap-1 rounded-[4px] bg-white px-2 py-1 border border-[rgba(55,53,47,0.08)]">
                      <MapPin size={11} />
                      {p.locations.length} location
                      {p.locations.length === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-[4px] bg-white px-2 py-1 border border-[rgba(55,53,47,0.08)]">
                      <Building2 size={11} />
                      {p._count.leads} lead{p._count.leads === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-auto flex items-center gap-1.5 pt-4 text-[11px] text-[rgba(55,53,47,0.4)]">
                    <Clock size={11} />
                    <span className="truncate">
                      {SCHEDULE_LABELS[p.schedule]}
                      {p.lastScrapedAt
                        ? ` · ${formatDistanceToNow(new Date(p.lastScrapedAt), { addSuffix: true })}`
                        : " · never scraped"}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProjectModal
        open={modalOpen}
        mode="create"
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
