import type {
  StartupRow,
  SwissStatusCode,
  EmployeeRangeCode,
  FundingStageCode,
} from "@/lib/startupApi";

export type StartupCardVM = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  logo_url: string | null;
  swiss_status: SwissStatusCode;
  swiss_status_label: string;
  swiss_status_badge: string;
  swiss_status_color: string;
  industry: string;
  city: string;
  employee_range: EmployeeRangeCode;
  employee_range_label: string;
  founded_year: number;
  is_featured: boolean;
  is_open_to_investment: boolean;
};

export const SWISS_STATUSES: readonly {
  code: SwissStatusCode;
  label: string;
  badge: string;
  color: string;
  description: string;
}[] = [
  {
    code: "swiss_based",
    label: "Swiss Based",
    badge: "SWISS BASED",
    color: "var(--da-green)",
    description: "Hauptsitz in der Schweiz",
  },
  {
    code: "swiss_founded",
    label: "Swiss Founded",
    badge: "SWISS FOUNDED",
    color: "var(--da-orange)",
    description: "Schweizer Gründer, international tätig",
  },
  {
    code: "active_in_ch",
    label: "Active in CH",
    badge: "ACTIVE IN CH",
    color: "var(--da-purple)",
    description: "Internationale Firma mit Schweizer Präsenz",
  },
];

export const EMPLOYEE_RANGES: readonly { code: EmployeeRangeCode; label: string }[] = [
  { code: "r_1_10",      label: "1–10" },
  { code: "r_11_50",     label: "11–50" },
  { code: "r_51_200",    label: "51–200" },
  { code: "r_201_500",   label: "201–500" },
  { code: "r_500_plus",  label: "500+" },
];

export const FUNDING_STAGES: readonly { code: FundingStageCode; label: string }[] = [
  { code: "bootstrapped",    label: "Bootstrapped" },
  { code: "pre_seed",        label: "Pre-Seed" },
  { code: "seed",            label: "Seed" },
  { code: "series_a",        label: "Series A" },
  { code: "series_b_plus",   label: "Series B+" },
  { code: "public_company",  label: "Public" },
];

export const INDUSTRIES: readonly string[] = [
  "FinTech",
  "HealthTech",
  "LegalTech",
  "MarTech",
  "Enterprise",
  "Retail",
  "Robotics",
  "Logistics",
  "Consulting",
  "AI Governance",
  "Andere",
];

export function lookupSwissStatus(code: SwissStatusCode) {
  return SWISS_STATUSES.find((s) => s.code === code) ?? SWISS_STATUSES[0];
}

export function lookupEmployeeRange(code: EmployeeRangeCode): string {
  return EMPLOYEE_RANGES.find((e) => e.code === code)?.label ?? code;
}

export function lookupFundingStage(code: FundingStageCode): string {
  return FUNDING_STAGES.find((f) => f.code === code)?.label ?? code;
}

export function startupToCardVM(row: StartupRow): StartupCardVM {
  const swiss = lookupSwissStatus(row.swiss_status);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    logo_url: row.logo_url,
    swiss_status: row.swiss_status,
    swiss_status_label: swiss.label,
    swiss_status_badge: swiss.badge,
    swiss_status_color: swiss.color,
    industry: row.industry,
    city: row.city,
    employee_range: row.employee_range,
    employee_range_label: lookupEmployeeRange(row.employee_range),
    founded_year: row.founded_year,
    is_featured: row.status === "featured",
    is_open_to_investment: row.open_to_investment,
  };
}
