import crypto from 'node:crypto'

import { validateAdminEnv } from '../../env/adminEnv.js'

const ALGORITHM = 'aes-256-gcm'

function getKey() {
  const { cmsEncryptionKey } = validateAdminEnv()
  return Buffer.from(cmsEncryptionKey, 'base64')
}

export function encryptSecret(value) {
  const text = typeof value === 'string' ? value : ''
  if (!text) return null

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return [iv, tag, encrypted].map((part) => part.toString('base64')).join(':')
}

export function decryptSecret(value) {
  const text = typeof value === 'string' ? value : ''
  if (!text) return null

  const [ivText, tagText, encryptedText] = text.split(':')
  if (!ivText || !tagText || !encryptedText) return null

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivText, 'base64')
  )
  decipher.setAuthTag(Buffer.from(tagText, 'base64'))

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
