// Shared Miro helpers. The regex here is duplicated in ui.html, which runs
// standalone in the iframe and is not part of the esbuild bundle.

export interface BoardDetails {
  title: string
  author: string
  thumbnail: string
}

const BOARD_URL = /miro\.com\/app\/(?:board|live-embed)\/([A-Za-z0-9_=+-]+)/

export function parseBoardId(url: string): string | null {
  const match = url.match(BOARD_URL)
  return match ? match[1] : null
}

export function isMiroUrl(url: string): boolean {
  return parseBoardId(url) !== null
}

// Only miro.com hosts are listed in manifest networkAccess, so anything else
// would render as an empty Image node.
export function isAllowedImage(url: string): boolean {
  return /^https:\/\/([a-z0-9-]+\.)*miro\.com\//i.test(url)
}

export function formatAgo(timestamp: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days}d ago`
  return `${Math.round(days / 30)}mo ago`
}

export function shortId(boardId: string): string {
  const trimmed = boardId.replace(/=+$/, '')
  return trimmed.length > 12 ? `${trimmed.slice(0, 12)}…` : trimmed
}
