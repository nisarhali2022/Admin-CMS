export function shufflePosts(posts, random = Math.random) {
  const shuffled = [...posts]

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export function selectLatestNewsPosts(posts, limit = 6, fixedCount = 2, random = Math.random) {
  if (!Array.isArray(posts) || posts.length === 0) return []

  const safeLimit = Math.max(0, limit)
  const safeFixedCount = Math.min(Math.max(0, fixedCount), safeLimit)
  const fixedPosts = posts.slice(0, safeFixedCount)
  const randomPosts = shufflePosts(posts.slice(safeFixedCount), random).slice(
    0,
    Math.max(0, safeLimit - fixedPosts.length)
  )

  return [...fixedPosts, ...randomPosts]
}
