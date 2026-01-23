import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useConversation, Conversation } from "@/hooks/useConversations";
import { ConversationList } from "@/components/messaging/ConversationList";
import { MessageThread } from "@/components/messaging/MessageThread";
import { MessageInput } from "@/components/messaging/MessageInput";
import { NewConversationDialog } from "@/components/messaging/NewConversationDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ArrowLeft, MessageSquare, MoreVertical, Archive, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useArchiveConversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export default function Messages() {
  const navigate = useNavigate();
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>();
  const [showSidebar, setShowSidebar] = useState(true);

  const { data: selectedConversation } = useConversation(selectedConversationId);
  const { mutate: archiveConversation } = useArchiveConversation();

  const isMobile = useMediaQuery("(max-width: 768px)");

  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth", { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    if (isMobile) {
      setShowSidebar(false);
    }
  };

  const handleBack = () => {
    if (isMobile) {
      setShowSidebar(true);
      setSelectedConversationId(undefined);
    }
  };

  const handleArchive = () => {
    if (selectedConversationId) {
      archiveConversation(selectedConversationId);
      setSelectedConversationId(undefined);
      if (isMobile) {
        setShowSidebar(true);
      }
    }
  };

  const getDisplayName = (conv: Conversation | undefined): string => {
    if (!conv?.other_user) return "Unknown";
    if (conv.other_user.first_name && conv.other_user.last_name) {
      return `${conv.other_user.first_name} ${conv.other_user.last_name}`;
    }
    return conv.other_user.email || "Unknown";
  };

  const getInitials = (conv: Conversation | undefined): string => {
    if (!conv?.other_user) return "?";
    if (conv.other_user.first_name && conv.other_user.last_name) {
      return `${conv.other_user.first_name[0]}${conv.other_user.last_name[0]}`.toUpperCase();
    }
    return conv.other_user.email?.[0]?.toUpperCase() || "?";
  };

  // Mobile layout
  if (isMobile) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {showSidebar ? (
          <>
            <div className="flex items-center justify-between p-4 border-b">
              <h1 className="text-xl font-semibold">Messages</h1>
              <NewConversationDialog
                onConversationCreated={(id) => {
                  setSelectedConversationId(id);
                  setShowSidebar(false);
                }}
              />
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationList
                selectedId={selectedConversationId}
                onSelect={handleSelectConversation}
              />
            </div>
          </>
        ) : (
          <>
            {/* Conversation header */}
            <div className="flex items-center gap-3 p-4 border-b">
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <Avatar className="h-9 w-9">
                <AvatarImage src={selectedConversation?.other_user?.avatar_url || undefined} />
                <AvatarFallback>{getInitials(selectedConversation)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{getDisplayName(selectedConversation)}</p>
                {selectedConversation?.property && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedConversation.property.name}
                    {selectedConversation.unit?.unit_number && ` - Unit ${selectedConversation.unit.unit_number}`}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedConversationId ? (
                <>
                  <MessageThread conversationId={selectedConversationId} />
                  <MessageInput conversationId={selectedConversationId} />
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  Select a conversation
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  // Desktop layout with resizable panels
  return (
    <div className="h-[calc(100vh-4rem)] p-6">
      <Card className="h-full overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col border-r">
              <div className="flex items-center justify-between p-4 border-b">
                <h1 className="text-lg font-semibold">Messages</h1>
                <NewConversationDialog
                  onConversationCreated={(id) => setSelectedConversationId(id)}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <ConversationList
                  selectedId={selectedConversationId}
                  onSelect={handleSelectConversation}
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Main content */}
          <ResizablePanel defaultSize={70}>
            <div className="h-full flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4 border-b">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={selectedConversation.other_user?.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(selectedConversation)}</AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{getDisplayName(selectedConversation)}</p>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" />
                        <span className="truncate">
                          {selectedConversation.property?.name}
                          {selectedConversation.unit?.unit_number &&
                            ` - Unit ${selectedConversation.unit.unit_number}`}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleArchive}>
                          <Archive className="h-4 w-4 mr-2" />
                          Archive conversation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Messages */}
                  <MessageThread conversationId={selectedConversation.id} />
                  <MessageInput conversationId={selectedConversation.id} />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the sidebar to start messaging</p>
                </div>
              )}
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </Card>
    </div>
  );
}
