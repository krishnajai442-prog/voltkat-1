export type ColorOption = { name: string; image: string };
export type VariantOption = { label: string; add: number; mrpAdd: number; available: boolean; note: string };
export type OptionGroup = { name: string; values: { label: string; add: number }[] };

export type ParsedOptions = Partial<{
  colors: string[];
  colorOptions: ColorOption[];
  variants: VariantOption[];
  optionGroups: OptionGroup[];
}>;

const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);
const num = (v: unknown, fallback = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const bool = (v: unknown, fallback = true): boolean => (typeof v === "boolean" ? v : fallback);

const normColor = (c: unknown): ColorOption =>
  typeof c === "string"
    ? { name: c.slice(0, 60), image: "" }
    : {
        name: str((c as { name?: unknown })?.name).slice(0, 60),
        image: (c as { image?: unknown })?.image ? str((c as { image?: unknown }).image).slice(0, 500) : "",
      };

/**
 * Sanitizes admin-submitted options. `colors` (String[] column) is derived from the
 * rich list so the two columns can never disagree. Returns only keys present in the
 * body, so spreading into Prisma `data` is a no-op otherwise. All values are
 * string/number/boolean/arrays only, so they satisfy Prisma's Json input type.
 */
export function parseProductOptions(body: any): ParsedOptions {
  if (!body || typeof body !== "object") return {};
  const out: ParsedOptions = {};

  const richSrc: unknown[] = Array.isArray(body.colorOptions)
    ? body.colorOptions
    : Array.isArray(body.colors)
      ? body.colors
      : [];
  if (Array.isArray(body.colorOptions) || Array.isArray(body.colors)) {
    const rich = richSrc.map(normColor).filter((c: ColorOption) => c.name !== "");
    out.colorOptions = rich;
    out.colors = rich.map((c: ColorOption) => c.name);
  }

  if (Array.isArray(body.variants)) {
    out.variants = body.variants
      .map((v: any): VariantOption => ({
        label: str(v?.label).slice(0, 80),
        add: num(v?.add),
        mrpAdd: num(v?.mrpAdd, num(v?.add)),
        available: bool(v?.available),
        note: str(v?.note).slice(0, 120),
      }))
      .filter((v: VariantOption) => v.label !== "");
  }

  if (Array.isArray(body.optionGroups)) {
    out.optionGroups = body.optionGroups
      .map((g: any): OptionGroup => ({
        name: str(g?.name).slice(0, 60),
        values: Array.isArray(g?.values)
          ? g.values
              .map((x: any): { label: string; add: number } => ({ label: str(x?.label).slice(0, 60), add: num(x?.add) }))
              .filter((x: { label: string; add: number }) => x.label !== "")
          : [],
      }))
      .filter((g: OptionGroup) => g.name !== "" && g.values.length > 0);
  }

  return out;
}