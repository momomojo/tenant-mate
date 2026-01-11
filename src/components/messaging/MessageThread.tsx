import { useEffect, useRef } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { useMessages, Message } from "@/hooks/useMessages";
import { useMarkMessagesRead } from "@/hooks/useMessages";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FileIcon, ImageIcon, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageThreadProps {
  conversationId: string;
}

export function MessageThread({ conversationId }: MessageThreadProps) {
  const { data: messages, isLoading } = useMessages(conversationId);
  const { mutate: markRead } = useMarkMessagesRead();
  const { user } = useAuthenticatedUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasMarkedRead = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && !hasMarkedRead.current && messages?.length) {
      hasMarkedRead.current = true;
      markRead(conversationId);
    }
  }, [conversationId, messages, markRead]);

  // Reset on conversation change
  useEffect(() => {
    hasMarkedRead.current = false;
  }, [conversationId]);

  if (isLoading) {
    return (
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn("flex gap-3", i % 2 === 0 && "justify-end")}>
            {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
            <Skeleton className={cn("h-16 rounded-lg", i % 2 === 0 ? "w-2/3" : "w-1/2")} />
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full shrink-0" />}
          </div>
        ))}
      </div>
    );
  }

  if (!messages?.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <p>No messages yet. Start the conversation!</p>
      </div>
    );
  }

  const formatMessageDate = (date: Date): string => {
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return `Yesterday ${format(date, "h:mm a")}`;
    return format(date, "MMM d, h:mm a");
  };

  const getInitials = (message: Message): string => {
    if (message.sender?.first_name && message.sender?.last_name) {
      return `${message.sender.first_name[0]}${message.sender.last_name[0]}`.toUpperCase();
    }
    return "?";
  };

  const renderAttachment = (message: Message) => {
    if (!message.attachment_url) return null;

    const isImage = message.message_type === "image";

    if (isImage) {
      return (
        <a
          href={message.attachment_url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mt-2 max-w-xs"
        >
          <img
            src={message.attachment_url}
            alt={message.attachment_name || "Attachment"}
            className="rounded-lg max-h-48 object-cover"
          />
        </a>
      );
    }

    return (
      <a
        href={message.attachment_url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 mt-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
      >
        <FileIcon className="h-4 w-4" />
        <span className="text-sm truncate">{message.attachment_name || "Attachment"}</span>
      </a>
    );
  };

  // Group messages by date
  let lastDate: string | null = null;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => {
        const isOwn = message.sender_id === user?.id;
        const messageDate = new Date(message.created_at);
        const dateKey = format(messageDate, "yyyy-MM-dd");
        const showDateHeader = dateKey !== lastDate;
        lastDate = dateKey;

        return (
          <div key={message.id}>
            {showDateHeader && (
              <div className="flex items-center justify-center my-4">
                <span className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                  {isToday(messageDate)
                    ? "Today"
                    : isYesterday(messageDate)
                      ? "Yesterday"
                      : format(messageDate, "MMMM d, yyyy")}
                </span>
              </div>
            )}

            <div className={cn("flex gap-3", isOwn && "flex-row-reverse")}>
              {!isOwn && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={message.sender?.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{getInitials(message)}</AvatarFallback>
                </Avatar>
              )}

              <div className={cn("max-w-[75%] space-y-1", isOwn && "items-end")}>
                <div
                  className={cn(
                    "px-4 py-2 rounded-2xl",
                    isOwn
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  {message.message_type === "system" ? (
                    <p className="text-sm italic">{message.content}</p>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  {renderAttachment(message)}
                </div>

                <div className={cn(
                  "flex items-center gap-1 px-1",
                  isOwn ? "justify-end" : "justify-start"
                )}>
                  <span className="text-xs text-muted-foreground">
                    {formatMessageDate(messageDate)}
                  </span>
                  {isOwn && (
                    message.read_at ? (
                      <CheckCheck className="h-3 w-3 text-primary" />
                    ) : (
                      <Check className="h-3 w-3 text-muted-foreground" />
                    )
                  )}
                </div>
              </div>

              {isOwn && (
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    You
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
