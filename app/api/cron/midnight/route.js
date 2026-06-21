import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { getKarachiDateISO } from '@/lib/date'

const PATHS_TO_REVALIDATE = [
  '/',
  '/sitemap_index.xml',
  '/page-sitemap.xml',
]

export async function GET(request) {
  const authorization = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  for (const path of PATHS_TO_REVALIDATE) {
    revalidatePath(path)
  }

  return NextResponse.json({
    revalidated: true,
    paths: PATHS_TO_REVALIDATE,
    karachiDate: getKarachiDateISO(),
    timestamp: new Date().toISOString(),
  })
}
