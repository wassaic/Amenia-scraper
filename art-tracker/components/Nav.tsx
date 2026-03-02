'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Nav() {
  const pathname = usePathname();

  const links = [
    { href: '/', label: 'Dashboard' },
    { href: '/collection', label: 'Collection' },
    { href: '/sold-gifted', label: 'Sold & Gifted' },
  ];

  return (
    <nav className="bg-stone-900 text-stone-100 px-6 py-4 flex items-center gap-8 shadow-md">
      <span className="text-xl font-semibold tracking-wide text-amber-400">Art Tracker</span>
      <div className="flex gap-4">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm font-medium transition-colors ${
              pathname === href
                ? 'text-amber-400 border-b border-amber-400 pb-0.5'
                : 'text-stone-300 hover:text-white'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
