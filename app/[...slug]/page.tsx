import { Content } from "@builder.io/react";

export default async function BuilderCatchAll({ params }: { params: { slug?: string[] } }) {
  const urlPath = "/" + (params.slug?.join("/") ?? "");
  const apiKey = process.env.BUILDER_PUBLIC_API_KEY!;
  const content = await fetch(
    `https://cdn.builder.io/api/v3/content/page?apiKey=${apiKey}&userAttributes.urlPath=${encodeURIComponent(urlPath)}`,
    { next: { revalidate: 60 } }
  ).then(r => r.json());

  return <Content model="page" apiKey={apiKey} content={content?.results?.[0]} />;
}
