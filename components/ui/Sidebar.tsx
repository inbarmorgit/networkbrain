'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '⚡' },
  { href: '/contacts', label: 'Contacts', icon: '👥' },
  { href: '/chat', label: 'AI Chat', icon: '💬' },
  { href: '/imports', label: 'Import', icon: '📥' },
]

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }
  return (
    <aside className="w-52 bg-white border-r border-gray-200 flex flex-col h-screen flex-shrink-0">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">NB</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">NetworkBrain</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {nav.map(item => (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <span>{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <p className="text-xs text-gray-400 px-3 py-1 truncate">{userEmail}</p>
        <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors">
          🚪 Sign out
        </button>
      </div>
    </aside>
  )
}
