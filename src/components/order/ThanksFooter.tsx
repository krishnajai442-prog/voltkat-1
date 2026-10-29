import Link from "next/link";

type Cat = { slug: string; name: string };

export function ThanksFooter({ categories }: { categories: Cat[] }) {
  return (
    <footer className="mt-10 rounded-xl bg-[#1a1a2e] px-5 py-7 text-[#9aa0b4]">
      <div className="grid gap-6 text-[11px] sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-[#878787]">About</p>
          <ul className="space-y-1.5">
            <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
            <li><Link href="/offers" className="hover:text-white">Offers</Link></li>
            <li><Link href="/products/all" className="hover:text-white">All Products</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-[#878787]">Help</p>
          <ul className="space-y-1.5">
            <li><Link href="/track" className="hover:text-white">Track Order</Link></li>
            <li><Link href="/contact" className="hover:text-white">Shipping</Link></li>
            <li><Link href="/contact" className="hover:text-white">Cancellations & Returns</Link></li>
            <li><Link href="/contact" className="hover:text-white">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-[#878787]">Consumer Policy</p>
          <ul className="space-y-1.5">
            <li><span className="cursor-default">Cancellation & Returns</span></li>
            <li><span className="cursor-default">Terms of Use</span></li>
            <li><span className="cursor-default">Privacy</span></li>
            <li><Link href="/contact" className="hover:text-white">Grievance Redressal</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-[#878787]">Shop by Category</p>
          <ul className="space-y-1.5">
            {categories.slice(0, 5).map((c) => (
              <li key={c.slug}><Link href={`/products/${c.slug}`} className="hover:text-white">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-2 font-bold uppercase tracking-wide text-[#878787]">Registered Office</p>
          <p className="leading-relaxed">
            VoltKart Retail Pvt. Ltd.<br />
            Bengaluru, Karnataka, India<br />
            Phone: 1800-120-4567
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[11px]">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/contact" className="hover:text-white">Help Center</Link>
          <span className="text-[#6b7280]">&copy; {new Date().getFullYear()} VoltKart</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {["UPI", "Cards", "Net Banking", "Wallet", "COD"].map((m) => (
            <span key={m} className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-[#c2c7d6]">{m}</span>
          ))}
        </div>
      </div>
    </footer>
  );
}