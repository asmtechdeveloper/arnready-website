import Link from 'next/link';

const COLUMNS: Array<{ heading: string; links: Array<{ href: string; label: string }> }> = [
  {
    heading: 'Study',
    links: [
      { href: '/chapters', label: 'All 12 chapters' },
      { href: '/questions', label: 'Practice questions' },
      { href: '/flashcards', label: 'Flashcards' },
      { href: '/mock-test', label: 'Mock test' },
    ],
  },
  {
    heading: 'The exam',
    links: [
      { href: '/nism-series-v-a', label: 'NISM Series V-A guide' },
      { href: '/syllabus', label: 'Syllabus & weightage' },
      { href: '/faq', label: 'FAQ' },
    ],
  },
  {
    heading: 'ARNReady',
    links: [
      { href: '/pricing', label: 'Pricing' },
      { href: '/about', label: 'About' },
      { href: '/support', label: 'Support' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/delete-account', label: 'Delete account' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h2 className="mb-3 text-sm font-black text-ink">{col.heading}</h2>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted hover:text-purple">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-line pt-6 text-center">
          <p className="mx-auto max-w-2xl text-xs leading-relaxed text-muted">
            ARNReady is built by ASM Tech and is an independent study aid. It is not
            affiliated with, endorsed by, or approved by NISM, SEBI, or AMFI. NISM
            is a trademark of the National Institute of Securities Markets.
          </p>
          <p className="mt-3 text-xs text-muted">
            Knowledge is free. Mastery is earned. &copy; 2026 ASM Tech &middot; Bengaluru, India
          </p>
        </div>
      </div>
    </footer>
  );
}
