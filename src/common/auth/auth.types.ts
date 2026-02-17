export const MEMBERSHIP_ROLES = [
  'OWNER',
  'ADMIN',
  'MANAGER',
  'CASHIER',
  'VIEWER',
] as const;

export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export type AuthUser = {
  userId: string;
  tenantId: string;
  membershipId: string;
  role: MembershipRole;
};

export type JwtPayload = {
  sub: string;
  tenantId: string;
  membershipId: string;
  role: MembershipRole;
};
