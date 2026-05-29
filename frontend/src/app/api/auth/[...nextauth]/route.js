import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import db from "../../../../../../backend/db"; 

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET,
  callbacks: {
    async signIn({ user, account, profile }) { 
      const [existing] = await db.promise().query(
        "SELECT id FROM users WHERE email = ?",
        [user.email]
      );

      if (existing.length > 0) {
        await db.promise().query(
          "UPDATE users SET isEmailVerified = TRUE, emailVerificationToken = NULL, emailVerificationExpires = NULL WHERE email = ?",
          [user.email]
        );
        return true;
      }
 
      await db.promise().query(
        "INSERT INTO users (fullName, email, role, photoUrl, isEmailVerified, created_at) VALUES (?, ?, 'users', ?, TRUE, NOW())",
        [user.name, user.email, user.image]
      );

      return true;
    },
  },
};

const handler = NextAuth(authOptions);  
export { handler as GET, handler as POST }; 
