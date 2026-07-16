import type { Lead } from "@prisma/client";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  if (!leads.length) {
    return (
      <div className="rounded-[6px] border border-dashed border-[rgba(55,53,47,0.16)] bg-[#fbfbfa] px-6 py-14 text-center">
        <p className="text-[14px] font-medium text-[#37352f]">No leads yet</p>
        <p className="mt-1 text-[13px] text-[rgba(55,53,47,0.5)]">
          Run the scraper when status is Ready to populate this table from OpenStreetMap.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[6px] border border-[rgba(55,53,47,0.09)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-[rgba(55,53,47,0.09)] bg-[#f7f6f3] text-[11px] uppercase tracking-wide text-[rgba(55,53,47,0.45)]">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Address</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Website</th>
              <th className="px-3 py-2 font-medium">Coords</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr
                key={lead.id}
                className="border-b border-[rgba(55,53,47,0.06)] last:border-0 hover:bg-[rgba(55,53,47,0.03)]"
              >
                <td className="px-3 py-2.5 font-medium text-[#37352f]">
                  {lead.name}
                </td>
                <td className="px-3 py-2.5 text-[rgba(55,53,47,0.65)]">
                  {lead.category || "—"}
                </td>
                <td className="max-w-[220px] truncate px-3 py-2.5 text-[rgba(55,53,47,0.65)]">
                  {lead.address || "—"}
                </td>
                <td className="px-3 py-2.5 text-[rgba(55,53,47,0.65)]">
                  {lead.phone || "—"}
                </td>
                <td className="px-3 py-2.5">
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#2383e2] hover:underline"
                    >
                      Link
                    </a>
                  ) : (
                    <span className="text-[rgba(55,53,47,0.35)]">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-[11px] text-[rgba(55,53,47,0.45)]">
                  {lead.lat != null && lead.lon != null
                    ? `${lead.lat.toFixed(4)}, ${lead.lon.toFixed(4)}`
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
