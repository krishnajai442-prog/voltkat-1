import { CalendarDays, MapPin, RefreshCcw, Store, Truck } from "lucide-react";

type Props = {
  returnableDays: number;
  /** e.g. "Sunday, 25 Oct" — computed by the page from now + 4 days. */
  deliveryByLabel?: string | null;
  /** Single-seller store: shown as "Seller: VoltKart". */
  sellerName?: string | null;
  /** Truncated saved-address line, when the actor has one. */
  addressLine?: string | null;
};

export function DeliveryDetails({ returnableDays, deliveryByLabel, sellerName, addressLine }: Props) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h3 className="mb-2 font-display text-[15px] font-bold text-gray-900">Delivery details</h3>
      <div className="space-y-2">
        {addressLine ? (
          <p className="flex items-center gap-2 rounded-lg bg-[#eef4ff] px-3 py-2.5 text-[13px] text-gray-800">
            <MapPin className="size-4 shrink-0 text-[#2874f0]" />
            <span className="truncate font-semibold">{addressLine}</span>
          </p>
        ) : null}

        <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800">
          <Truck className="size-4 shrink-0 text-[#2874f0]" />
          Free delivery
        </p>

        <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800">
          <Truck className="size-4 shrink-0 text-[#2874f0]" />
          Delivery in 3–5 business days
        </p>

        {deliveryByLabel ? (
          <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800">
            <CalendarDays className="size-4 shrink-0 text-[#2874f0]" />
            <span>
              Delivery by <span className="font-bold">{deliveryByLabel}</span>
            </span>
          </p>
        ) : null}

        <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800">
          <RefreshCcw className="size-4 shrink-0 text-[#2874f0]" />
          {returnableDays}-day replacement window
        </p>

        {sellerName ? (
          <p className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 text-[13px] text-gray-800">
            <Store className="size-4 shrink-0 text-[#2874f0]" />
            <span>
              Seller: <span className="font-semibold">{sellerName}</span>
            </span>
          </p>
        ) : null}
      </div>
    </section>
  );
}

export default DeliveryDetails;