export function ContentPage({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-reading px-4 py-12 sm:px-6">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-purple sm:text-4xl">{title}</h1>
        {meta && <p className="mt-1 text-sm text-muted">{meta}</p>}
      </header>
      <div className="rounded-card bg-white p-8 shadow-card sm:p-11">
        <div className="space-y-6 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink [&_h2]:mb-2 [&_p]:text-[0.95rem] [&_p]:leading-7 [&_p]:text-muted [&_ul]:space-y-2 [&_li]:text-[0.95rem] [&_li]:leading-7 [&_li]:text-muted [&_a]:text-purple [&_a]:no-underline hover:[&_a]:underline">
          {children}
        </div>
      </div>
    </div>
  );
}
