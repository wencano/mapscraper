import { ProjectStatus } from "@prisma/client";

const STYLES: Record<ProjectStatus, { label: string; className: string }> = {
  DRAFT: {
    label: "Draft",
    className: "bg-[rgba(55,53,47,0.08)] text-[rgba(55,53,47,0.65)]",
  },
  READY: {
    label: "Ready",
    className: "bg-[rgba(15,123,108,0.12)] text-[#0f7b6c]",
  },
  SCRAPING: {
    label: "Scraping",
    className: "bg-[rgba(35,131,226,0.12)] text-[#2383e2]",
  },
  DONE: {
    label: "Done",
    className: "bg-[rgba(68,131,97,0.14)] text-[#448361]",
  },
  ERROR: {
    label: "Error",
    className: "bg-[rgba(212,76,71,0.12)] text-[#d44c47]",
  },
};

export function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STYLES[status] || STYLES.DRAFT;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${s.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {s.label}
    </span>
  );
}
