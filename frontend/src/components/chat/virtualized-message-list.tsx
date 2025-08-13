import { useCallback, useEffect, useRef, useMemo } from 'react'
import { FixedSizeList as List, ListChildComponentProps } from 'react-window'
import InfiniteLoader from 'react-window-infinite-loader'
import { ChatMessage } from '../../contexts/chat.context'
import { useAuth } from '../../contexts/auth.context'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '../ui/button'
import { Reply } from 'lucide-react'

interface VirtualizedMessageListProps {
  messages: ChatMessage[]
  hasMore: boolean
  isLoading: boolean
  onLoadMore: () => Promise<void>
  onReply: (message: ChatMessage) => void
  height: number
}

const MESSAGE_HEIGHT = 96 

export function VirtualizedMessageList({
  messages,
  hasMore,
  isLoading,
  onLoadMore,
  onReply,
  height,
}: VirtualizedMessageListProps) {
  const { user } = useAuth()
  const listRef = useRef<List>(null)
  const infiniteLoaderRef = useRef(null)


  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.scrollToItem(messages.length - 1, 'end')
    }
  }, [messages.length])


  const isItemLoaded = useCallback(
    (index: number) => {
      return !!messages[index]
    },
    [messages]
  )


  const loadMoreItems = useCallback(
    async () => {
      if (hasMore && !isLoading) {
        await onLoadMore()
      }
    },
    [hasMore, isLoading, onLoadMore]
  )


  const itemCount = useMemo(() => {
    return hasMore ? messages.length + 1 : messages.length
  }, [messages.length, hasMore])


  const MessageItem = useCallback(
    ({ index, style }: ListChildComponentProps) => {
      const message = messages[index]


      if (!message) {
        return (
          <div style={style} className="flex items-center justify-center">
            <div className="text-sm text-muted-foreground">Carregando...</div>
          </div>
        )
      }

      const isOwn = message.userId === user?.id

      return (
        <div style={style} className="px-4 py-3">
          <MessageItemContent
            message={message}
            isOwn={isOwn}
            onReply={onReply}
          />
        </div>
      )
    },
    [messages, user?.id, onReply]
  )

  return (
    <InfiniteLoader
      ref={infiniteLoaderRef}
      isItemLoaded={isItemLoaded}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
      threshold={5} 
    >
      {({ onItemsRendered, ref }: { onItemsRendered: any; ref: any }) => (
        <List
          ref={(list) => {
            listRef.current = list
            ref(list)
          }}
          height={height}
          width="100%"
          itemCount={itemCount}
          itemSize={MESSAGE_HEIGHT}
          onItemsRendered={onItemsRendered}
          overscanCount={5} 
        >
          {MessageItem}
        </List>
      )}
    </InfiniteLoader>
  )
}


interface MessageItemContentProps {
  message: ChatMessage
  isOwn: boolean
  onReply: (message: ChatMessage) => void
}

function MessageItemContent({
  message,
  isOwn,
  onReply,
}: MessageItemContentProps) {
  if (!message.user) {
    return (
      <div className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium flex-shrink-0">
          ?
        </div>
        <div className={`flex-1 max-w-lg ${isOwn ? 'text-right' : ''}`}>
          <div className="p-3 rounded-lg bg-muted text-muted-foreground">
            Carregando mensagem...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex gap-3 group ${isOwn ? 'flex-row-reverse' : ''}`}>

      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium flex-shrink-0">
        {message.user.avatar ? (
          <img
            src={message.user.avatar}
            alt={message.user.username}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          message.user.username[0].toUpperCase()
        )}
      </div>


      <div className={`flex-1 max-w-lg ${isOwn ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{message.user.username}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
              locale: ptBR,
            })}
          </span>
          {message.edited && (
            <span className="text-xs text-muted-foreground">(editada)</span>
          )}
        </div>


        {message.replyTo && (
          <div className="mb-2 p-2 border-l-2 border-muted bg-muted/30 rounded text-sm">
            <div className="font-medium">{message.replyTo.user.username}</div>
            <div className="text-muted-foreground truncate">
              {message.replyTo.content}
            </div>
          </div>
        )}


        <div
          className={`p-3 rounded-lg ${
            isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'
          } ${message.deleted ? 'italic opacity-60' : ''}`}
        >
          {message.content}
        </div>


        {!message.deleted && (
          <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 mt-2 ${isOwn ? 'justify-end' : ''}`}>
            <Button variant="ghost" size="sm" onClick={() => onReply(message)}>
              <Reply className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
