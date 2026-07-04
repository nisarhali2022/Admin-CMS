'use client'

import PostsManager from '@/features/posts/PostsManager'
import WebsiteSectionShell from '@/features/websites/WebsiteSectionShell'

export default function PostsWorkspace() {
  return (
    <WebsiteSectionShell
      sectionLabel="Blog"
      sectionTitle="Posts"
      sectionPath="/admin/posts"
    >
      {({ selectedWebsite }) => <PostsManager websiteId={selectedWebsite.id} />}
    </WebsiteSectionShell>
  )
}
