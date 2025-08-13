import { useState, useEffect, useRef, useCallback } from 'react'
import { useChat, ChatMessage } from '../../contexts/chat.context'
import { useAuth } from '../../contexts/auth.context'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Send, Smile, MoreVertical, Reply, Edit } from 'lucide-react'
import { VirtualizedMessageList } from './virtualized-message-list'

interface ChatWindowProps {
  roomId: string
}

export function ChatWindow({ roomId }: ChatWindowProps) {
  const { user } = useAuth()
  const { 
    rooms, 
    sendMessage, 
    loadMessages, 
    markAsRead, 
    startTyping, 
    stopTyping,
    editMessage,
    deleteMessage,
    isConnected 
  } = useChat()
  
  const [messageInput, setMessageInput] = useState('')
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null)
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [containerHeight, setContainerHeight] = useState(400)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const room = rooms?.get(roomId)

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerHeight(rect.height)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  useEffect(() => {
    if (!room?.messages.length) return

    const lastMessage = room.messages[room.messages.length - 1]
    if (lastMessage && lastMessage.userId !== user?.id) {
      markAsRead(lastMessage.id)
    }
  }, [room?.messages, user?.id, markAsRead])

  const handleInputChange = (value: string) => {
    setMessageInput(value)

    if (value.trim() && !isTyping) {
      setIsTyping(true)
      startTyping(roomId)
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      stopTyping(roomId)
    }, 1000)
  }

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return

    const content = messageInput.trim()
    setMessageInput('')
    setReplyTo(null)

    if (editingMessage) {
      setEditingMessage(null)
    } else {
      await sendMessage(roomId, content, replyTo?.id)
    }

    if (isTyping) {
      setIsTyping(false)
      stopTyping(roomId)
    }
  }

  const handleLoadMore = useCallback(async () => {
    if (!room?.hasMore || room.isLoading) return

    const oldestMessage = room.messages[0]
    if (oldestMessage) {
      await loadMessages(roomId, oldestMessage.createdAt)
    }
  }, [room, roomId, loadMessages])

  if (!rooms) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">Carregando contexto do chat...</h3>
          <p className="text-muted-foreground">Inicializando</p>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-medium">Carregando chat...</h3>
          <p className="text-muted-foreground">Conectando ao room</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="border-b p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold truncate">{room.name}</h2>
            <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="hidden sm:inline">{isConnected ? 'Conectado' : 'Desconectado'}</span>
              {room.typingUsers.length > 0 && (
                <span className="text-blue-500 truncate">
                  {room.typingUsers.join(', ')} {room.typingUsers.length === 1 ? 'está' : 'estão'} digitando...
                </span>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1">
        <VirtualizedMessageList
          messages={room.messages}
          hasMore={room.hasMore}
          isLoading={room.isLoading}
          onLoadMore={handleLoadMore}
          onReply={setReplyTo}
          height={containerHeight}
        />
      </div>

      {replyTo && (
        <div className="border-t p-2 bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs md:text-sm flex-1 min-w-0">
              <Reply className="w-4 h-4 flex-shrink-0" />
              <span className="hidden sm:inline">Respondendo a <strong>{replyTo.user.username}</strong></span>
              <span className="text-muted-foreground truncate">
                {replyTo.content}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyTo(null)}
              className="flex-shrink-0"
            >
              ✕
            </Button>
          </div>
        </div>
      )}

      <div className="border-t p-3 md:p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative min-w-0">
            <Input
              value={messageInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder={
                editingMessage 
                  ? "Editar mensagem..." 
                  : replyTo 
                    ? `Responder a ${replyTo.user.username}...`
                    : "Digite uma mensagem..."
              }
              disabled={!isConnected}
              className="min-w-0"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            disabled={!isConnected}
            className="flex-shrink-0"
          >
            <Smile className="w-4 h-4" />
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || !isConnected}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
