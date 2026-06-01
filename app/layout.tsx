import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InvoiceHub India — Free GST Invoice Generator Online",
  description:
    "Create professional GST invoices, tax invoices, quotations, and purchase orders free. Supports CGST, SGST, IGST. Download PDF instantly. No signup required.",
  keywords: [
    "free invoice generator india",
    "gst invoice maker online",
    "tax invoice format india",
    "gst invoice download pdf",
    "free invoice software india",
    "online invoice generator india free",
    "gst bill maker",
    "proforma invoice india",
    "quotation format india",
    "free billing software india",
  ].join(", "),
  openGraph: {
    title: "InvoiceHub India — Free GST Invoice Generator",
    description:
      "Make professional GST invoices in 60 seconds. Free, no signup. CGST/SGST/IGST support, 10 templates, PDF & Excel export.",
    url: "https://invoicehub.in",
    siteName: "InvoiceHub India",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "InvoiceHub India — Free GST Invoice Generator",
    description: "Make professional GST invoices in 60 seconds. Free, no signup.",
  },
  alternates: {
    canonical: "https://invoicehub.in",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1 },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN">
      <head>
        {/* Structured data for rich search results */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "InvoiceHub India",
              url: "https://invoicehub.in",
              description:
                "Free online GST invoice generator for Indian businesses and freelancers",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Any",
              offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
