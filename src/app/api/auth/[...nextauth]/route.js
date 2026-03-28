import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import db from "../../../../../backend/db"; // your database connection

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) {
      // Check if the user exists
      const [existing] = await db.promise().query(
        "SELECT id FROM users WHERE email = ?",
        [user.email]
      );

      if (existing.length > 0) {
        // User already exists, let them login
        return true;
      }

      // If not, insert new Google user
      await db.promise().query(
        "INSERT INTO users (fullName, email, role, photoUrl, created_at) VALUES (?, ?, 'users', ?, NOW())",
        [user.name, user.email, user.image]
      );

      return true;
    },
  },
};

const handler = NextAuth(authOptions);  
export { handler as GET, handler as POST }; 