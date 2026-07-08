export function shouldRenderAdsense(settings) {
  const adsense = settings?.adsense || settings
  return Boolean(
    adsense?.enabled &&
      typeof adsense.publisherId === 'string' &&
      adsense.publisherId.startsWith('ca-pub-')
  )
}

export function getAdsenseScriptSrc(settings) {
  const adsense = settings?.adsense || settings
  if (!shouldRenderAdsense(adsense)) return null

  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(adsense.publisherId)}`
}

export function getAdsTxtContent(settings) {
  const adsense = settings?.adsense || settings
  if (!shouldRenderAdsense(adsense)) return null
  return adsense.adsTxt || null
}
