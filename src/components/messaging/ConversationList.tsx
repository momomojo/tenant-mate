import { formatDistanceToNow } from "date-fns";
import { useConversations, Conversation } from "@/hooks/useConversations";
import { useAuthenticatedUser } from "@/hooks/useAuthenticatedUser";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationList({ selectedId, onSelect }: ConversationListProps) {
  const { data: conversations, isLoading } = useConversations();
  const { user } = useAuthenticatedUser();

  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!conversations?.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <MessageSquare className="h-12 w-12 mb-4 opacity-50" />
        <p className="font-medium">No conversations yet</p>
        <p className="text-sm">Start a conversation with a tenant or landlord</p>
      </div>
    );
  }

  const getUnreadCount = (conv: Conversation): number => {
    if (!user) return 0;
    return conv.landlord_id === user.id
      ? conv.landlord_unread_count
      : conv.tenant_unread_count;
  };

  const getInitials = (conv: Conversation): string => {
    const other = conv.other_user;
    if (other?.first_name && other?.last_name) {
      return `${other.first_name[0]}${other.last_name[0]}`.toUpperCase();
    }
    return other?.email?.[0]?.toUpperCase() || "?";
  };

  const getDisplayName = (conv: Conversation): string => {
    const other = conv.other_user;
    if (other?.first_name && other?.last_name) {
      return `${other.first_name} ${other.last_name}`;
    }
    return other?.email || "Unknown";
  };

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((conversation) => {
          const unread = getUnreadCount(conversation);
          const isSelected = conversation.id === selectedId;

          return (
            <button
              key={conversation.id}
              onClick={() => onSelect(conversation)}
              className={cn(
                "w-full flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors",
                isSelected && "bg-muted"
              )}
            >
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarFallback>{getInitials(conversation)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn(
                    "font-medium truncate",
                    unread > 0 && "font-semibold"
                  )}>
                    {getDisplayName(conversation)}
                  </span>
                  {conversation.last_message_at && (
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5">
                  <Building2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">
                    {conversation.property?.name || "Property"}
                    {conversation.unit?.unit_number && ` - Unit ${conversation.unit.unit_number}`}
                  </span>
                </div>

                {conversation.last_message_preview && (
                  <p className={cn(
                    "text-sm text-muted-foreground truncate mt-1",
                    unread > 0 && "text-foreground"
                  )}>
                    {conversation.last_message_preview}
                  </p>
                )}
              </div>

              {unread > 0 && (
                <Badge variant="default" className="shrink-0 rounded-full h-5 min-w-[1.25rem] flex items-center justify-center">
                  {unread}
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
