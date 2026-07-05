'use client'

import PostsManager from '@/features/posts/PostsManager'
import WebsiteContextShell from '@/features/websites/WebsiteContextShell'

export default function PostsWorkspace() {
  return (
    <WebsiteContextShell>
      {({ selectedWebsite }) => <PostsManager websiteId={selectedWebsite.id} />}
    </WebsiteContextShell>
  )
}
