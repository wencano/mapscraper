import { Project, Lead, ScheduleInterval, ProjectStatus } from "@prisma/client";

export type { Project, Lead, ScheduleInterval, ProjectStatus };

export type ProjectWithCount = Project & {
  _count: { leads: number };
};

export type ProjectWithLeads = Project & {
  leads: Lead[];
  _count?: { leads: number };
};

export type ProjectFormValues = {
  name: string;
  searchQuery: string;
  locationsText: string;
  schedule: ScheduleInterval;
};
