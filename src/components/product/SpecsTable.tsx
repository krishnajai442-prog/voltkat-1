export type Spec = {
  group: string;
  label: string;
  value: string;
};

export function SpecsTable({ specifications }: { specifications: Spec[] }) {
  if (!specifications.length) return null;

  const grouped = specifications.reduce<Record<string, Spec[]>>((acc, spec) => {
    acc[spec.group] ??= [];
    acc[spec.group]?.push(spec);
    return acc;
  }, {});

  return (
    <section className="card overflow-hidden">
      <header className="border-b border-hairline px-4 py-3">
        <h2 className="font-display text-[15px] font-bold text-ink-900">Specifications</h2>
      </header>

      <div className="divide-y divide-hairline">
        {Object.entries(grouped).map(([group, rows]) => (
          <div key={group} className="p-4">
            <h3 className="mb-2.5 text-[12px] font-bold uppercase tracking-wider text-ink-300">
              {group}
            </h3>

            <dl className="grid gap-2 sm:grid-cols-2">
              {rows.map((r) => (
                <div
                  key={`${r.group}-${r.label}`}
                  className="flex items-baseline justify-between gap-3 rounded-lg bg-canvas px-3 py-2"
                >
                  <dt className="text-[12.5px] text-ink-400">{r.label}</dt>
                  <dd className="text-right text-[12.5px] font-semibold text-ink-900">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </section>
  );
}