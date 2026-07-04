export async function triggerRevalidation() {
  return {
    attempted: false,
    skipped: true,
    reason: 'Revalidation webhooks are configured in a later milestone.',
  }
}
