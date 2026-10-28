import { Store, Truck } from "lucide-react";

export function DeliveryMeta({ etaLong, seller = "VoltKart" }: { etaLong: string; seller?: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-[12.5px] text-gray-700">
        <Truck className="size-4 shrink-0 text-[#2874f0]" />
        <span>Delivery by <span className="font-bold text-gray-900">{etaLong}</span></span>
      </div>
      <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 px-3 py-2.5 text-[12.5px] text-gray-700">
        <Store className="size-4 shrink-0 text-[#2874f0]" />
        <span>Sold by <span className="font-bold text-gray-900">{seller}</span></span>
      </div>
    </div>
  );
}
export default DeliveryMeta;