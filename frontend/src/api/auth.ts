/**
 * Authentication API client
 */

import axios from "axios";

const api = axios.create({ baseURL: "/api" });

// Set auth token on the axios instance
export function setAuthToken(token: string) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function clearAuthToken() {
  delete api.defaults.headers.common["Authorization"];
}

// Types
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_active: boolean;
  is_verified: boolean;
  role: string;
  created_at: string;
  last_login: string | null;
  organization: OrganizationInfo | null;
  subscription: SubscriptionInfo | null;
}

export interface OrganizationInfo {
  id: number;
  name: string;
  slug: string;
  role: string;
  member_count: number;
}

export interface SubscriptionInfo {
  plan: string;
  status: string;
  seats_limit: number;
  repos_limit: number;
  integrations_limit: number;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at: string | null;
}

export interface PlanInfo {
  id: string;
  name: string;
  price_monthly: number;
  seats: number;
  repos: number;
  integrations: number;
  features: string[];
  is_current: boolean;
}

export interface BillingOverview {
  subscription: {
    plan: string;
    plan_name: string;
    status: string;
    price_monthly: number;
    current_period_start: string | null;
    current_period_end: string | null;
    trial_end: string | null;
    cancel_at: string | null;
  } | null;
  usage: {
    repos_scanned: number;
    repos_limit: number;
    tickets_created: number;
    api_calls: number;
    integrations_active: number;
    integrations_limit: number;
    seats_used: number;
    seats_limit: number;
  };
  plans: PlanInfo[];
}

export interface APIKeyInfo {
  id: number;
  name: string;
  prefix: string;
  key?: string;
  scopes: string[] | null;
  last_used: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

// Auth API functions
export async function login(
  email: string,
  password: string
): Promise<TokenResponse> {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function register(
  email: string,
  password: string,
  fullName: string,
  orgName?: string
): Promise<TokenResponse> {
  const { data } = await api.post("/auth/register", {
    email,
    password,
    full_name: fullName,
    org_name: orgName,
  });
  return data;
}

export async function refreshToken(
  refreshTokenValue: string
): Promise<TokenResponse> {
  const { data } = await api.post("/auth/refresh", {
    refresh_token: refreshTokenValue,
  });
  return data;
}

export async function getProfile(): Promise<UserProfile> {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function updateProfile(updates: {
  full_name?: string;
  avatar_url?: string;
}): Promise<{ success: boolean }> {
  const { data } = await api.put("/auth/me", updates);
  return data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean }> {
  const { data } = await api.post("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return data;
}

// API Key functions
export async function createAPIKey(
  name: string,
  scopes?: string[],
  expiresInDays?: number
): Promise<APIKeyInfo> {
  const { data } = await api.post("/auth/api-keys", {
    name,
    scopes,
    expires_in_days: expiresInDays,
  });
  return data;
}

export async function listAPIKeys(): Promise<APIKeyInfo[]> {
  const { data } = await api.get("/auth/api-keys");
  return data;
}

export async function revokeAPIKey(
  keyId: number
): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/auth/api-keys/${keyId}`);
  return data;
}

// Billing API functions
export async function getBillingPlans(): Promise<PlanInfo[]> {
  const { data } = await api.get("/billing/plans");
  return data;
}

export async function getBillingOverview(): Promise<BillingOverview> {
  const { data } = await api.get("/billing/overview");
  return data;
}

export async function createCheckout(
  plan: string,
  billingPeriod: string = "monthly"
): Promise<{ checkout_url: string; session_id: string }> {
  const { data } = await api.post("/billing/checkout", {
    plan,
    billing_period: billingPeriod,
  });
  return data;
}

export async function openCustomerPortal(): Promise<{ portal_url: string }> {
  const { data } = await api.post("/billing/portal");
  return data;
}

export async function getStripeStatus(): Promise<{ configured: boolean }> {
  const { data } = await api.get("/billing/stripe-status");
  return data;
}

// Organization API functions
export interface OrgMember {
  user_id: number;
  email: string;
  full_name: string;
  role: string;
  joined_at: string;
}

export async function getOrganization(): Promise<OrganizationInfo> {
  const { data } = await api.get("/org/");
  return data;
}

export async function updateOrganization(
  name: string,
  slug?: string
): Promise<OrganizationInfo> {
  const { data } = await api.put("/org/", { name, slug });
  return data;
}

export async function getOrgMembers(): Promise<OrgMember[]> {
  const { data } = await api.get("/org/members");
  return data;
}

export async function inviteMember(
  email: string,
  role: string = "member"
): Promise<OrgMember> {
  const { data } = await api.post("/org/members", { email, role });
  return data;
}

export async function updateMemberRole(
  userId: number,
  role: string
): Promise<{ success: boolean }> {
  const { data } = await api.put(`/org/members/${userId}/role`, {
    email: "",
    role,
  });
  return data;
}

export async function removeMember(
  userId: number
): Promise<{ success: boolean }> {
  const { data } = await api.delete(`/org/members/${userId}`);
  return data;
}
