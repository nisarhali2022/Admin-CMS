import { AlertTriangle, CircleCheck } from 'lucide-react'
import { getContentQualityWarnings } from 'cms-core/cms/contentQuality'

export default function ContentQualityPanel({
  entityType,
  contentHtml,
  seoTitle,
  metaDescription,
  focusKeyphrase,
  featuredImage,
}) {
  const warnings = getContentQualityWarnings({
    entityType,
    contentHtml,
    seoTitle,
    metaDescription,
    focusKeyphrase,
    featuredImage,
  })

  return (
    <section
      className="rounded-[3px] border border-[#dcdcde] bg-[#f6f7f7] p-4"
      aria-live="polite"
      aria-label="Content quality checks"
    >
      <div className="flex items-center gap-2">
        {warnings.length ? (
          <AlertTriangle className="h-4 w-4 text-[#996800]" aria-hidden="true" />
        ) : (
          <CircleCheck className="h-4 w-4 text-[#008a20]" aria-hidden="true" />
        )}
        <h3 className="text-[14px] font-semibold text-[#1f2330]">Content checks</h3>
      </div>
      {warnings.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[13px] leading-5 text-[#50575e]">
          {warnings.map((warning) => (
            <li key={warning.id}>{warning.message}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-[#50575e]">
          No common content-quality issues found. You can still save at any time.
        </p>
      )}
      <p className="mt-2 text-[12px] text-[#50575e]">
        These are suggestions only and never prevent saving.
      </p>
    </section>
  )
}
