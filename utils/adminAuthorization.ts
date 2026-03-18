import { UserDoc } from "./types";

type SessionUserLike = Omit<Partial<UserDoc>, "_id"> & { _id?: string };
type AdminUserLike = Omit<Partial<UserDoc>, "_id"> & {
  _id?: string | UserDoc["_id"];
};
type SessionLike = {
  user?: SessionUserLike;
  token?: {
    user?: SessionUserLike;
  };
} | null | undefined;

const ADMIN_USERNAME = "grwyler";
const ADMIN_EMAIL = "grwyler@gmail.com";

const normalizeText = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const normalizeRoles = (roles: unknown) =>
  Array.isArray(roles)
    ? roles
        .map((role) => normalizeText(role).toLowerCase())
        .filter(Boolean)
    : [];

const isRecognizedAdminIdentity = (
  user: AdminUserLike | null | undefined
) => {
  const username = normalizeText(user?.username).toLowerCase();
  const email = normalizeText(user?.email).toLowerCase();

  return username === ADMIN_USERNAME || email === ADMIN_EMAIL;
};

export const hasUserRole = (
  user: AdminUserLike | null | undefined,
  role: string
) => normalizeRoles(user?.roles).includes(normalizeText(role).toLowerCase());

export const hasUserPermission = (
  user: AdminUserLike | null | undefined,
  permission: keyof NonNullable<UserDoc["permissions"]>
) => Boolean(user?.permissions?.[permission]);

export const isAppAdminUser = (user: AdminUserLike | null | undefined) =>
  hasUserRole(user, "admin") || isRecognizedAdminIdentity(user);

export const isBugWorkflowAdminUser = (
  user: AdminUserLike | null | undefined
) =>
  hasUserPermission(user, "bugWorkflowAdmin") ||
  isAppAdminUser(user);

export const isFoundingBetaAdminUser = (
  user: AdminUserLike | null | undefined
) =>
  hasUserPermission(user, "foundingBetaAdmin") ||
  isAppAdminUser(user);

export const isAppAdminSession = (session: SessionLike) =>
  isAppAdminUser(session?.user) || isAppAdminUser(session?.token?.user);

export const isBugWorkflowAdminSession = (session: SessionLike) =>
  isBugWorkflowAdminUser(session?.user) ||
  isBugWorkflowAdminUser(session?.token?.user);

export const isFoundingBetaAdminSession = (session: SessionLike) =>
  isFoundingBetaAdminUser(session?.user) ||
  isFoundingBetaAdminUser(session?.token?.user);

export const getSessionUserId = (session: SessionLike) =>
  normalizeText(session?.user?._id || session?.token?.user?._id);

export const getSessionUserProfile = (session: SessionLike) => ({
  _id: getSessionUserId(session),
  username: normalizeText(
    session?.user?.username || session?.token?.user?.username
  ),
  email: normalizeText(session?.user?.email || session?.token?.user?.email),
  roles:
    (session?.user?.roles as string[] | undefined) ??
    (session?.token?.user?.roles as string[] | undefined) ??
    [],
  permissions:
    session?.user?.permissions ??
    session?.token?.user?.permissions ??
    undefined,
});
