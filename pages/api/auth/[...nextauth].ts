import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import FacebookProvider from "next-auth/providers/facebook";
import GoogleProvider from "next-auth/providers/google";
import { connectToDatabase } from "../../../utils/mongodb";
import { verifyAndUpgradePassword } from "../../../utils/passwords";

const createUsernameSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "athlete";

const getUniqueUsername = async (baseValue: string) => {
  const db = await connectToDatabase();
  const users = db.collection("users");
  const base = createUsernameSlug(baseValue);

  let attempt = base;
  let suffix = 1;

  while (await users.findOne({ username: attempt })) {
    attempt = `${base}-${suffix}`;
    suffix += 1;
  }

  return attempt;
};

const toSessionUser = (user: any) => {
  const { password, sessionId, providerAccountId, ...safeUser } = user || {};
  const normalizedId = user?._id?.toString?.() ?? String(user?._id ?? "");

  return {
    ...safeUser,
    _id: normalizedId,
    id: normalizedId,
  } as any;
};

const getOrCreateOAuthUser = async ({
  provider,
  providerAccountId,
  email,
  name,
}: {
  provider: string;
  providerAccountId: string;
  email?: string | null;
  name?: string | null;
}) => {
  const db = await connectToDatabase();
  const users = db.collection("users");

  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const normalizedProviderAccountId = String(providerAccountId ?? "").trim();

  let user = await users.findOne({
    provider,
    providerAccountId: normalizedProviderAccountId,
  });

  if (!user && normalizedEmail) {
    user = await users.findOne({ email: normalizedEmail });
  }

  if (user) {
    const update: Record<string, unknown> = {
      provider,
      providerAccountId: normalizedProviderAccountId,
      email: normalizedEmail || user.email,
      name: name || user.name,
      updatedAt: new Date(),
    };

    await users.updateOne({ _id: user._id }, { $set: update });
    return toSessionUser({
      ...user,
      ...update,
    });
  }

  const username = await getUniqueUsername(
    normalizedEmail.split("@")[0] || name || provider
  );

  const doc = {
    username,
    email: normalizedEmail || undefined,
    name: name || username,
    provider,
    providerAccountId: normalizedProviderAccountId,
    sex: "",
    age: "",
    preferredUnits: "lb",
    trainingGoal: "",
    currentFitnessLevel: "",
    workoutDaysPerWeek: "",
    experienceLevel: "",
    workoutLength: "",
    equipmentAccess: [],
    maxDumbbellWeight: "",
    preferredTrainingDays: [],
    limitations: "",
    darkMode: false,
    notes: "",
    setupPromptSeen: false,
    setupCompleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await users.insertOne(doc);

  return toSessionUser({
    ...doc,
    _id: result.insertedId,
  });
};

const providers = [
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
      ]
    : []),
  ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
    ? [
        FacebookProvider({
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        }),
      ]
    : []),
];

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  providers: [
    ...providers,
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const username = String(credentials?.username ?? "").trim();
          const password = String(credentials?.password ?? "");

          if (!username || !password) {
            return null;
          }

          const db = await connectToDatabase();
          const users = db.collection("users");
          const user = await users.findOne({ username });

          if (
            !user ||
            !(await verifyAndUpgradePassword({
              usersCollection: users,
              user,
              candidatePassword: password,
            }))
          ) {
            return null;
          }

          return toSessionUser(user);
        } catch (error) {
          console.error("NextAuth authorize error:", error);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    signOut: "/signout",
    error: "/signin",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") {
        return true;
      }

      try {
        const appUser = await getOrCreateOAuthUser({
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          email: user.email,
          name: user.name,
        });

        (user as any).appUser = appUser;
        return true;
      } catch (error) {
        console.error("NextAuth OAuth signIn error:", error);
        return false;
      }
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.user = ((user as any).appUser || user) as any;
      } else if (account?.provider && account.provider !== "credentials") {
        try {
          const appUser = await getOrCreateOAuthUser({
            provider: account.provider,
            providerAccountId: account.providerAccountId,
            email: token.email,
            name: token.name,
          });
          token.user = appUser;
        } catch (error) {
          console.error("NextAuth OAuth jwt error:", error);
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token?.user) {
        session.user = token.user as any;
        (session as any).token = { user: token.user };
      }

      return session;
    },
  },
};

export default NextAuth(authOptions);
