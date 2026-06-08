import { injectAdAfterFirstParagraph } from '@/lib/utils';
import AdInArticle from '@/components/ads/AdInArticle';

export default function PostContent({ content }) {
  // Inject in-article ad after the first paragraph
  const adHtml = `<div class="ad-in-article my-6"></div>`;
  const processedContent = injectAdAfterFirstParagraph(content, adHtml);

  return (
    <>
      <div
        className="prose prose-lg max-w-none
          prose-headings:font-merriweather prose-headings:text-text-primary
          prose-a:text-accent hover:prose-a:text-primary
          prose-img:rounded-lg prose-img:shadow-sm
          prose-blockquote:border-accent prose-blockquote:text-text-secondary"
        dangerouslySetInnerHTML={{ __html: processedContent }}
      />
      {/* The ad-in-article div injected above is replaced visually via this component */}
      <div className="my-6">
        <AdInArticle />
      </div>
    </>
  );
}