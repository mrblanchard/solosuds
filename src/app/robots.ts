import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/dashboard/",
          "/dev/",
          "/api/",
          "/portal/",
        ],
      },
    ],
    sitemap: "https://solosuds.com/sitemap.xml",
  };
}
