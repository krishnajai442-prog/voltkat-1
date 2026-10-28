import { redirect } from "next/navigation";

export default async function SearchRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  redirect(`/products/all${q ? `?q=${encodeURIComponent(q)}` : ""}`);
}