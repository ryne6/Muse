/**
 * Attachment stored in database (with BLOB data)
 */
export interface Attachment {
  id: string
  messageId: string
  filename: string
  mimeType: string
  data: Buffer
  note: string | null
  size: number
  width: number | null
  height: number | null
  createdAt: Date
}

/**
 * Attachment preview (without BLOB data, for list display)
 */
export interface AttachmentPreview {
  id: string
  messageId: string
  filename: string
  mimeType: string
  note: string | null
  size: number
  width: number | null
  height: number | null
  createdAt: Date
}

/**
 * Pending attachment before message is sent
 */
export interface PendingAttachment {
  id: string
  file: File
  filename: string
  mimeType: string
  dataUrl: string
  note: string
  size: number
  width: number | null
  height: number | null
}

/**
 * Data for creating a new attachment
 */
export interface NewAttachmentData {
  messageId: string
  filename: string
  mimeType: string
  data: Buffer
  note?: string
  size: number
  width?: number
  height?: number
}

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number]

/**
 * Maximum attachment size (10MB)
 */
export const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024

/**
 * Check if a MIME type is a supported image type
 */
export function isSupportedImageType(mimeType: string): mimeType is SupportedImageType {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)
}
