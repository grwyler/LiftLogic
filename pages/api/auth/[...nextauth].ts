import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import {
  connectToDatabase,
  disconnectFromDatabase,
} from "../../../utils/mongodb";

export default NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Credentials({
      // The name to display on the sign-in form (e.g., 'Sign in with...')
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const db = await connectToDatabase();

          const user = await db.collection("users").findOne({
            username: credentials.username,
            password: credentials.password, // TODO: Hash the password before storing and comparing
          });

          if (user) {
            // Any object returned here will be saved in the JSON Web Token
            return Promise.resolve(user);
          } else {
            return Promise.resolve(null);
          }
        } catch (error) {
          console.error(error);
        }
      },
    }),
  ],
  pages: {
    signIn: "/signin",
    signOut: "/signout",
    error: "/signin", // Redirect to the sign-in page in case of an error
  },
  callbacks: {
    async jwt(token, user, account, profile, isNewUser) {
      // If the user information is nested within the 'token' property
      if (token && token.token && token.token.user) {
        token.user = token.token.user;
      }

      return token;
    },
    async session(session, token) {
      // If the user information is nested within the 'token' property
      if (token && token.token && token.token.user) {
        session.user = token.token.user;
      }

      return session;
    },
  } as any,
});
