import Link from 'next/link';
import Arnie from '@/components/Arnie';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Arnie mood="dozing" size={180} />
      <h1 className="text-3xl font-black text-ink">This page dozed off</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted">
        Whatever you were looking for isn&apos;t here. The chapters, however, are
        exactly where you left them.
      </p>
      <Link
        href="/"
        className="rounded-full bg-purple px-8 py-3 text-sm font-black text-white shadow-card hover:bg-purple-dark"
      >
        Back to ARNReady
      </Link>
    </div>
  );
}
