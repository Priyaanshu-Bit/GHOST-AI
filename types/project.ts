export interface Project {
  id: string;
  name: string;
  slug?: string;
  isOwner?: boolean;
  updatedAt?: string | Date;
  createdAt?: string | Date;
  description?: string | null;
}

/**
 * Generates a URL-safe slug from a project name.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const INITIAL_MOCK_OWNED_PROJECTS: Project[] = [
  {
    id: "proj-ecommerce-core",
    name: "Payment Gateway Architecture",
    slug: "payment-gateway-architecture",
    isOwner: true,
    updatedAt: "2 hours ago",
    createdAt: new Date().toISOString(),
  },
  {
    id: "proj-auth-service",
    name: "Auth & Identity Service",
    slug: "auth-identity-service",
    isOwner: true,
    updatedAt: "Yesterday",
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_MOCK_SHARED_PROJECTS: Project[] = [
  {
    id: "proj-analytics-pipeline",
    name: "Analytics Pipeline",
    slug: "analytics-pipeline",
    isOwner: false,
    updatedAt: "3 days ago",
    createdAt: new Date().toISOString(),
  },
];

