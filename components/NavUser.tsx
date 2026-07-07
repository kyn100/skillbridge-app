'use client';
import { useSession, signOut } from 'next-auth/react';
import { LogOut, UserCircle } from 'lucide-react';

export function NavUser() {
  const { data: session } = useSession();
  if (!session?.user) return null;
  return (
    <div className="flex items-center gap-2 pl-2 border-l border-gray-200">
      <div className="flex items-center gap-1.5 text-sm text-gray-600">
        <UserCircle size={16} className="text-gray-400" />
        <span className="hidden sm:block font-medium">{session.user.name}</span>
      </div>
      <button
        onClick={() => signOut({ callbackUrl: '/login' })}
        title="Sign out"
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
      >
        <LogOut size={13} />
        <span className="hidden sm:block">Sign out</span>
      </button>
    </div>
  );
}
