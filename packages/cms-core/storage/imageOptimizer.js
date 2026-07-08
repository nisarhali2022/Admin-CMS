import sharp from 'sharp'

const ACCEPTED_IMAGE_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const MAX_IMAGE_WIDTH = 1200

export class ImageValidationError extends Error {
  constructor(message, { code = 'INVALID_IMAGE' } = {}) {
    super(message)
    this.name = 'ImageValidationError'
    this.status = 400
    this.code = code
  }
}

export function assertUploadFile(file) {
  if (!file || typeof file.arrayBuffer !== 'function') {
    throw new ImageValidationError('Image file is required.', {
      code: 'IMAGE_FILE_REQUIRED',
    })
  }

  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new ImageValidationError('Unsupported image type.', {
      code: 'UNSUPPORTED_IMAGE_TYPE',
    })
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageValidationError('Image must be 10MB or smaller.', {
      code: 'IMAGE_TOO_LARGE',
    })
  }
}

export async function optimizeImageToWebp(file) {
  assertUploadFile(file)

  const input = Buffer.from(await file.arrayBuffer())
  const image = sharp(input, {
    animated: false,
    failOn: 'error',
  }).rotate()

  const metadata = await image.metadata()
  const output = await image
    .resize({
      width: MAX_IMAGE_WIDTH,
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
      effort: 5,
    })
    .toBuffer()

  const outputMetadata = await sharp(output).metadata()

  return {
    bytes: output,
    width: outputMetadata.width || metadata.width || null,
    height: outputMetadata.height || metadata.height || null,
    mimeType: 'image/webp',
    fileSize: output.byteLength,
  }
}
