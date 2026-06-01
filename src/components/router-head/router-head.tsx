import { component$ } from "@builder.io/qwik";
import { useDocumentHead, useLocation } from "@builder.io/qwik-city";

/**
 * The RouterHead component is placed inside of the document `<head>` element.
 */
export const RouterHead = component$(() => {
  const head = useDocumentHead();
  const loc = useLocation();

  return (
    <>
      <title>{head.title || "Rotary Club of Nairobi South"}</title>

      <link rel="canonical" href={loc.url.href} />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="icon" type="image/png" href="/favicon.png" />

      {/* Global Open Graph & Twitter Card SEO previews */}
      <meta property="og:title" content={head.title || "Rotary Club of Nairobi South"} />
      <meta property="og:description" content="Explore activities, events, birthdays, and recaps from the Rotary Club of Nairobi South." />
      <meta property="og:image" content={`${loc.url.origin}/images/seo-preview.png`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={head.title || "Rotary Club of Nairobi South"} />
      <meta name="twitter:description" content="Explore activities, events, birthdays, and recaps from the Rotary Club of Nairobi South." />
      <meta name="twitter:image" content={`${loc.url.origin}/images/seo-preview.png`} />

      {head.meta.map((m) => (
        <meta key={m.key} {...m} />
      ))}

      {head.links.map((l) => (
        <link key={l.key} {...l} />
      ))}

      {head.styles.map((s) => (
        <style
          key={s.key}
          {...s.props}
          {...(s.props?.dangerouslySetInnerHTML
            ? {}
            : { dangerouslySetInnerHTML: s.style })}
        />
      ))}

      {head.scripts.map((s) => (
        <script
          key={s.key}
          {...s.props}
          {...(s.props?.dangerouslySetInnerHTML
            ? {}
            : { dangerouslySetInnerHTML: s.script })}
        />
      ))}
    </>
  );
});
