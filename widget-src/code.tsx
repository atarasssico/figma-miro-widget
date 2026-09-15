import { BoardDetails, formatAgo, isAllowedImage, shortId } from './miro'

const { widget } = figma
const {
  AutoLayout,
  Frame,
  Image,
  Input,
  SVG,
  Text,
  useSyncedState,
  usePropertyMenu,
} = widget

const INK = '#0F0F10'
const MUTED = '#8A8A8F'
const FAINT = '#B0B0B6'
const LINE = '#E6E6EA'
const MIRO_YELLOW = '#FFD02F'
const MIRO_INK = '#050038'

const CARD_WIDTH = { full: 320, compact: 252 }

const STATUSES = [
  { option: 'none', label: 'No status', bg: '#F1F1F4', fg: '#6B6B70' },
  { option: 'todo', label: 'To do', bg: '#EBECF0', fg: '#42526E' },
  { option: 'progress', label: 'In progress', bg: '#DEEBFF', fg: '#0052CC' },
  { option: 'review', label: 'In review', bg: '#FFF0B3', fg: '#974F0C' },
  { option: 'done', label: 'Done', bg: '#E3FCEF', fg: '#006644' },
]

// Miro mark. Path from the Simple Icons set (CC0); the mark itself is Miro's
// trademark, used here to identify the service the card links to.
const MIRO_GLYPH =
  'M17.392 0H13.9L17 4.808 10.444 0H6.949l3.102 6.3L3.494 0H0l3.05 8.131L0 24h3.494L10.05 6.985 6.949 24h3.494L17 5.494 13.899 24h3.493L24 3.672 17.392 0z'

const MIRO_MARK = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="24" height="24" rx="6" fill="${MIRO_YELLOW}"/>
  <g transform="translate(5 5) scale(0.5833)"><path d="${MIRO_GLYPH}" fill="${MIRO_INK}"/></g>
</svg>`

const ARROW_OUT = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M3 7L7 3M7 3H3.8M7 3v3.2" stroke="${MIRO_INK}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const icon = (path: string) =>
  `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="${path}" stroke="#FFFFFF" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`

const ICON_EDIT = icon('M10.5 2.5l3 3L6 13H3v-3l7.5-7.5z')
const ICON_SYNC = icon('M13 8a5 5 0 1 1-1.6-3.7M13 2v3h-3')
const ICON_COMPACT = icon('M2 5h12M2 11h12')
const ICON_TRASH = icon('M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.7 8.5h5.6l.7-8.5')

interface SavedBoard {
  url: string
  boardId: string
  title: string
  note: string
  author: string
  thumbnail: string
}

type UiMessage =
  | { type: 'ready' }
  | { type: 'cancel' }
  | { type: 'save'; board: SavedBoard }
  | { type: 'synced'; details: BoardDetails }
  | { type: 'sync-error'; message: string }

function statusFor(option: string) {
  return STATUSES.find((entry) => entry.option === option) || STATUSES[0]
}

function MiroBoardWidget() {
  const [url, setUrl] = useSyncedState('url', '')
  const [boardId, setBoardId] = useSyncedState('boardId', '')
  const [title, setTitle] = useSyncedState('title', '')
  const [note, setNote] = useSyncedState('note', '')
  const [author, setAuthor] = useSyncedState('author', '')
  const [thumbnail, setThumbnail] = useSyncedState('thumbnail', '')
  const [status, setStatus] = useSyncedState('status', 'none')
  const [syncedAt, setSyncedAt] = useSyncedState<number | null>('syncedAt', null)
  const [compact, setCompact] = useSyncedState('compact', false)
  const [error, setError] = useSyncedState('error', '')

  function openDialog(): Promise<void> {
    return new Promise((resolve) => {
      figma.showUI(__html__, { width: 340, height: 340, title: 'Miro board' })
      figma.ui.onmessage = (message: UiMessage) => {
        if (message.type === 'ready') {
          figma.ui.postMessage({
            type: 'edit',
            board: { url, title, note, author, thumbnail },
          })
          return
        }
        if (message.type === 'save') {
          const board = message.board
          setUrl(board.url)
          setBoardId(board.boardId)
          setTitle(board.title || `Board ${shortId(board.boardId)}`)
          setNote(board.note)
          setAuthor(board.author)
          setThumbnail(board.thumbnail)
          setSyncedAt(Date.now())
          setError('')
        }
        figma.closePlugin()
        resolve()
      }
    })
  }

  function syncBoard(): Promise<void> {
    if (!url) return Promise.resolve()
    return new Promise((resolve) => {
      const finish = () => {
        clearTimeout(guard)
        figma.closePlugin()
        resolve()
      }
      const guard = setTimeout(() => {
        setError('Miro did not respond. Try again.')
        finish()
      }, 20000)

      figma.showUI(__html__, { visible: false })
      figma.ui.onmessage = (message: UiMessage) => {
        if (message.type === 'ready') {
          figma.ui.postMessage({ type: 'sync', url })
          return
        }
        if (message.type === 'synced') {
          const details = message.details
          if (details.title) setTitle(details.title)
          setAuthor(details.author)
          setThumbnail(details.thumbnail)
          setSyncedAt(Date.now())
          setError('')
          finish()
          return
        }
        if (message.type === 'sync-error') {
          setError(message.message)
          finish()
        }
      }
    })
  }

  function clearBoard() {
    setUrl('')
    setBoardId('')
    setTitle('')
    setNote('')
    setAuthor('')
    setThumbnail('')
    setStatus('none')
    setSyncedAt(null)
    setError('')
  }

  usePropertyMenu(
    url
      ? [
          { itemType: 'action', propertyName: 'edit', tooltip: 'Edit link', icon: ICON_EDIT },
          { itemType: 'action', propertyName: 'sync', tooltip: 'Reload details', icon: ICON_SYNC },
          { itemType: 'link', propertyName: 'open', tooltip: 'Open in Miro', href: url, icon: null },
          { itemType: 'separator' },
          {
            itemType: 'dropdown',
            propertyName: 'status',
            tooltip: 'Status',
            selectedOption: status,
            options: STATUSES.map((entry) => ({ option: entry.option, label: entry.label })),
          },
          {
            itemType: 'toggle',
            propertyName: 'compact',
            tooltip: 'Compact',
            isToggled: compact,
            icon: ICON_COMPACT,
          },
          { itemType: 'separator' },
          { itemType: 'action', propertyName: 'clear', tooltip: 'Remove board', icon: ICON_TRASH },
        ]
      : [{ itemType: 'action', propertyName: 'edit', tooltip: 'Add board link', icon: ICON_EDIT }],
    ({ propertyName, propertyValue }) => {
      if (propertyName === 'edit') return openDialog()
      if (propertyName === 'sync') return syncBoard()
      if (propertyName === 'status') setStatus(propertyValue || 'none')
      if (propertyName === 'compact') setCompact(!compact)
      if (propertyName === 'clear') clearBoard()
    }
  )

  if (!url) return <EmptyCard onAdd={openDialog} />

  const width = compact ? CARD_WIDTH.compact : CARD_WIDTH.full
  const badge = statusFor(status)
  const showThumbnail = !compact && isAllowedImage(thumbnail)
  const showPreview = !compact && !showThumbnail

  return (
    <AutoLayout
      name="Miro board"
      direction="vertical"
      width={width}
      padding={16}
      spacing={12}
      fill="#FFFFFF"
      cornerRadius={16}
      stroke={LINE}
      strokeWidth={1}
      effect={{
        type: 'drop-shadow',
        color: { r: 0, g: 0, b: 0, a: 0.07 },
        offset: { x: 0, y: 3 },
        blur: 10,
        spread: 0,
      }}
    >
      <AutoLayout width="fill-parent" spacing="auto" verticalAlignItems="center">
        <AutoLayout spacing={8} verticalAlignItems="center">
          <SVG src={MIRO_MARK} width={22} height={22} />
          <AutoLayout direction="vertical" spacing={2}>
            <Text fontSize={9} fontWeight={700} fill={MUTED} letterSpacing={0.8} textCase="upper">
              Miro board
            </Text>
            <Text fontSize={9} fill={FAINT}>
              {shortId(boardId)}
            </Text>
          </AutoLayout>
        </AutoLayout>
        <AutoLayout
          fill={badge.bg}
          cornerRadius={6}
          padding={{ vertical: 4, horizontal: 8 }}
          verticalAlignItems="center"
        >
          <Text fontSize={9} fontWeight={700} fill={badge.fg} letterSpacing={0.3}>
            {badge.label}
          </Text>
        </AutoLayout>
      </AutoLayout>

      <AutoLayout direction="vertical" width="fill-parent" spacing={6}>
        <Text
          width="fill-parent"
          fontSize={15}
          fontWeight={700}
          fill={INK}
          lineHeight={20}
          truncate={2}
          href={url}
          tooltip={title}
        >
          {title}
        </Text>
        <Input
          value={note}
          placeholder="Add a note"
          placeholderProps={{ fill: FAINT }}
          width="fill-parent"
          fontSize={11}
          lineHeight={16}
          fill="#6A6A70"
          inputBehavior="multiline"
          onTextEditEnd={(event) => setNote(event.characters)}
        />
      </AutoLayout>

      {showThumbnail ? (
        <Image src={thumbnail} width={width - 32} height={132} cornerRadius={10} />
      ) : null}
      {showPreview ? <BoardPreview width={width - 32} /> : null}

      {error ? (
        <Text width="fill-parent" fontSize={10} lineHeight={14} fill="#C9372C">
          {error}
        </Text>
      ) : null}

      <Frame width="fill-parent" height={1} fill={LINE} />

      <AutoLayout width="fill-parent" spacing="auto" verticalAlignItems="center">
        <AutoLayout
          fill={MIRO_YELLOW}
          cornerRadius={8}
          padding={{ vertical: 7, horizontal: 10 }}
          spacing={6}
          verticalAlignItems="center"
          hoverStyle={{ fill: '#F2C200' }}
        >
          <Text fontSize={11} fontWeight={700} fill={MIRO_INK} href={url}>
            Open board
          </Text>
          <SVG src={ARROW_OUT} width={10} height={10} />
        </AutoLayout>
        <AutoLayout direction="vertical" spacing={2} horizontalAlignItems="end">
          {author ? (
            <Text fontSize={10} fill={MUTED} truncate={1} width={compact ? 96 : 140} horizontalAlignText="right">
              {author}
            </Text>
          ) : null}
          <Text fontSize={9} fill={FAINT}>
            {syncedAt ? `Synced ${formatAgo(syncedAt, Date.now())}` : 'Not synced'}
          </Text>
        </AutoLayout>
      </AutoLayout>
    </AutoLayout>
  )
}

function BoardPreview({ width }: { width: number }) {
  return (
    <Frame
      name="Preview"
      width={width}
      height={104}
      cornerRadius={10}
      fill="#F7F7F9"
      stroke={LINE}
      strokeWidth={1}
    >
      <Frame x={16} y={20} width={66} height={46} cornerRadius={4} fill="#FFF9B1" />
      <Frame x={82} y={42} width={18} height={2} fill="#D2D2DA" />
      <Frame x={100} y={16} width={66} height={46} cornerRadius={4} fill="#D5F692" />
      <Frame x={width - 92} y={22} width={72} height={32} cornerRadius={4} fill="#A6CCF5" />
      <Frame x={width - 132} y={66} width={62} height={24} cornerRadius={4} fill="#FFCEE0" />
      <Frame x={24} y={76} width={44} height={8} cornerRadius={4} fill="#E4E4EA" />
    </Frame>
  )
}

function EmptyCard({ onAdd }: { onAdd: () => Promise<void> }) {
  return (
    <AutoLayout
      name="Miro board"
      direction="vertical"
      width={CARD_WIDTH.full}
      padding={{ vertical: 24, horizontal: 20 }}
      spacing={10}
      horizontalAlignItems="center"
      fill="#FFFFFF"
      cornerRadius={16}
      stroke="#D9D9E0"
      strokeWidth={1}
      strokeDashPattern={[6, 4]}
    >
      <SVG src={MIRO_MARK} width={32} height={32} />
      <Text fontSize={13} fontWeight={700} fill={INK}>
        No board linked
      </Text>
      <Text
        width={228}
        fontSize={11}
        lineHeight={16}
        fill={MUTED}
        horizontalAlignText="center"
      >
        Paste a Miro board link to keep it, and its details, on this canvas.
      </Text>
      <AutoLayout
        fill={MIRO_INK}
        cornerRadius={8}
        padding={{ vertical: 8, horizontal: 14 }}
        hoverStyle={{ fill: '#1C1660' }}
        onClick={onAdd}
      >
        <Text fontSize={11} fontWeight={700} fill="#FFFFFF">
          Add board link
        </Text>
      </AutoLayout>
    </AutoLayout>
  )
}

widget.register(MiroBoardWidget)
