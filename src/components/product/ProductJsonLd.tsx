type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription?: string | null;
  mrp: number;
  salePrice: number;
  stock: number;
  ratingAvg: number;
  ratingCount: number;
  brand: { name: string };
  category: { name: string };
  images: { url: string }[];
};

type Review = {
  rating: number;
  title: string | null;
  body: string;
  author: string;
  at: string;
};

export function ProductJsonLd({
  product,
  reviews,
}: {
  product: Product;
  reviews: Review[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription ?? product.name,
    image: product.images.map((i) => i.url),
    sku: product.id,
    mpn: product.slug,
    brand: {
      "@type": "Brand",
      name: product.brand.name,
    },
    category: product.category.name,
    offers: {
      "@type": "Offer",
      url: `https://voltkart.in/product/${product.slug}`,
      priceCurrency: "INR",
      price: product.salePrice,
      availability: product.stock > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "VoltKart",
      },
    },
    aggregateRating:
      product.ratingCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: product.ratingAvg,
            reviewCount: product.ratingCount,
          }
        : undefined,
    review: reviews.slice(0, 5).map((r) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: r.rating,
        bestRating: 5,
        worstRating: 1,
      },
      name: r.title ?? undefined,
      reviewBody: r.body,
      author: {
        "@type": "Person",
        name: r.author,
      },
      datePublished: r.at,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}