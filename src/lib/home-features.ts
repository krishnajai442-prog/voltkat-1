export type FeatureKey =
  | "HOT_DEALS"
  | "BEST_SELLERS"
  | "WISHLIST"
  | "NEW_ARRIVALS"
  | "TRENDING";

export type FeatureDef = {
  key: FeatureKey;
  title: string;  // shopper-facing heading on the home page
  bg: string;     // tailwind bg class for the header strip
  text: string;   // tailwind text class for the header strip
  help: string;
};

// Render order matches the original DynamicRails section order exactly.
export const HOME_FEATURES: FeatureDef[] = [
  { key: "HOT_DEALS",    title: "Top Deals on Tech",       bg: "bg-purple-700", text: "text-white", help: "Products with big discounts, shown in the purple rail." },
  { key: "BEST_SELLERS", title: "Bestsellers of the Sale", bg: "bg-blue-600",   text: "text-white", help: "Proven picks based on orders, ratings and repeat demand." },
  { key: "WISHLIST",     title: "Add to Your Wishlist",    bg: "bg-pink-500",   text: "text-white", help: "High-consideration products worth saving for later." },
  { key: "NEW_ARRIVALS", title: "New Arrivals",            bg: "bg-orange-500", text: "text-white", help: "Fresh drops with first-day pricing." },
  { key: "TRENDING",     title: "Suggested For You",       bg: "bg-gray-800",   text: "text-white", help: "Mixed pool shown to every visitor." },
];

export const FEATURE_KEYS = HOME_FEATURES.map((f) => f.key) as [FeatureKey, ...FeatureKey[]];

export function featureByKey(key: string): FeatureDef | undefined {
  return HOME_FEATURES.find((f) => f.key === key);
}