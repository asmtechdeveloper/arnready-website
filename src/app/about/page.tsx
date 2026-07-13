import type { Metadata } from 'next';
import Link from 'next/link';
import { Arnie } from '@/components/Arnie';

export const metadata: Metadata = {
  title: 'About ARNReady',
  description: 'Why ARNReady exists, who built it, and the honesty philosophy behind the scoring.',
  alternates: { canonical: '/about' },
};

// WORKING — para 1 is [SLOT]: Anusha's origin story, first person. Not
// invented here (copy scaffold §7 forbids a model inventing it).
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-reading px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Why ARNReady exists
      </h1>

      <div className="mt-8 space-y-6 text-base leading-7 text-muted">
        <p className="rounded-control border border-line bg-white p-4 text-sm italic text-muted">
          [SLOT — Anusha&rsquo;s origin story, first person: what annoyed you
          about existing prep options, why this exam, why &ldquo;honest
          scoring&rdquo;.]
        </p>
        <p>
          ARNReady is an app, and now a website, built to get you genuinely
          ready for the NISM Series V-A Mutual Fund Distributor exam —
          practice, exam mode, and full mock tests, scored the strict way, so
          the number on screen means what it says. Premium removes the caps,
          not the honesty. It&rsquo;s a one-time ₹250, because a subscription
          for a study aid felt wrong.
        </p>
        <p>
          ARNReady is built and run by Anusha Murthy, trading as ASM Tech —
          one developer, one product, real answers when you write in.
        </p>
      </div>

      <div className="mt-10 flex justify-center">
        <Arnie mood="reading" size={160} />
      </div>
      <p className="mt-4 text-center text-sm leading-7 text-muted">
        This is Arnie. He&rsquo;s a panda, he&rsquo;s preparing for the same
        exam as you, and he refuses to celebrate until you&rsquo;ve actually
        earned it. We find this motivating and slightly rude.
      </p>

      <div className="mt-10 flex justify-center">
        <Link
          href="/pricing"
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          See free vs. premium
        </Link>
      </div>
    </div>
  );
}
