import type { Metadata } from 'next';
import Link from 'next/link';
import { nismSeriesVA } from '@/lib/copy';

export const metadata: Metadata = {
  title: nismSeriesVA.meta.title,
  description: nismSeriesVA.meta.description,
  alternates: { canonical: '/nism-series-v-a' },
};

export default function NismSeriesVAPage() {
  return (
    <div className="mx-auto max-w-reading px-4 py-14 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{nismSeriesVA.h1}</h1>
      <p className="mt-4 text-base leading-7 text-muted">{nismSeriesVA.intro}</p>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">{nismSeriesVA.format.h2}</h2>
        <table className="mt-4 w-full border-collapse text-left text-sm">
          <caption className="sr-only">{nismSeriesVA.format.caption}</caption>
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                Property
              </th>
              <th scope="col" className="sr-only">
                Value
              </th>
            </tr>
          </thead>
          <tbody className="text-muted">
            {nismSeriesVA.format.rows.map(([label, value]) => (
              <tr key={label} className="border-b border-line last:border-0">
                <th scope="row" className="py-2 pr-4 text-left font-semibold text-ink">
                  {label}
                </th>
                <td className="py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold text-ink">{nismSeriesVA.help.h2}</h2>
        <p className="mt-3 leading-7 text-muted">{nismSeriesVA.help.body}</p>
      </section>

      <div className="mt-10 flex justify-center">
        <Link
          href={nismSeriesVA.cta.href}
          className="rounded-pill bg-purple px-6 py-3 text-base font-bold text-white hover:bg-purple-dark"
        >
          {nismSeriesVA.cta.label}
        </Link>
      </div>
    </div>
  );
}
