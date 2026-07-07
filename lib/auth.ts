import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getDb } from './db';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? [GitHubProvider({
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        })]
      : []),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const db = getDb();
        const user = db.prepare('SELECT * FROM users WHERE email=?').get(credentials.email.toLowerCase().trim()) as {
          id: string; name: string; email: string; password_hash: string;
        } | undefined;
        if (!user || !user.password_hash) return null;
        const valid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!valid) return null;
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google' || account?.provider === 'github') {
          // OAuth sign-in: find or auto-create a DB user by email
          const db = getDb();
          const email = (token.email ?? user.email ?? '').toLowerCase().trim();
          let dbUser = db.prepare('SELECT id FROM users WHERE email=?').get(email) as { id: string } | undefined;
          if (!dbUser) {
            const id = crypto.randomUUID();
            db.prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)').run(
              id, token.name ?? user.name ?? '', email, ''
            );
            dbUser = { id };
          }
          token.id = dbUser.id;
        } else {
          token.id = user.id;
        }
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) (session.user as { id: string }).id = token.id as string;
      return session;
    },
  },
};
