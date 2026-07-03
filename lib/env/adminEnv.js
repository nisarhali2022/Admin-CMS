export const REQUIRED_ADMIN_ENV_KEYS = [
  'ADMIN_SECRET',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CMS_ENCRYPTION_KEY',
]

function getValue(source, key) {
  const value = source[key]
  return typeof value === 'string' ? value.trim() : ''
}

export function validateAdminEnv(source = process.env) {
  const missing = REQUIRED_ADMIN_ENV_KEYS.filter((key) => !getValue(source, key))

  const encryptionKey = getValue(source, 'CMS_ENCRYPTION_KEY')
  let encryptionKeyError = null

  if (encryptionKey) {
    try {
      if (Buffer.from(encryptionKey, 'base64').length !== 32) {
        encryptionKeyError = 'CMS_ENCRYPTION_KEY must decode to 32 bytes.'
      }
    } catch {
      encryptionKeyError = 'CMS_ENCRYPTION_KEY must be valid base64.'
    }
  }

  if (missing.length > 0 || encryptionKeyError) {
    const details = [
      missing.length > 0
        ? `Missing required admin env vars: ${missing.join(', ')}.`
        : null,
      encryptionKeyError,
    ].filter(Boolean)

    throw new Error(details.join(' '))
  }

  return {
    adminSecret: getValue(source, 'ADMIN_SECRET'),
    supabaseUrl: getValue(source, 'NEXT_PUBLIC_SUPABASE_URL'),
    supabaseServiceRoleKey: getValue(source, 'SUPABASE_SERVICE_ROLE_KEY'),
    cmsEncryptionKey: getValue(source, 'CMS_ENCRYPTION_KEY'),
  }
}
