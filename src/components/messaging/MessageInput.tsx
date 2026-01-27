import { useState, useRef, KeyboardEvent } from "react";
import { useSendMessage, useUploadMessageAttachment } from "@/hooks/useMessages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Image, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  conversationId: string;
  disabled?: boolean;
}

export function MessageInput({ conversationId, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { mutateAsync: uploadAttachment, isPending: isUploading } = useUploadMessageAttachment();

  const isLoading = isSending || isUploading;

  const handleSend = async () => {
    if ((!content.trim() && !attachment) || isLoading) return;

    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;
    let messageType: "text" | "image" | "file" = "text";

    if (attachment) {
      try {
        const result = await uploadAttachment(attachment);
        attachmentUrl = result.url;
        attachmentName = result.name;
        messageType = attachment.type.startsWith("image/") ? "image" : "file";
      } catch (error) {
        console.error("Failed to upload attachment:", error);
        return;
      }
    }

    sendMessage({
      conversationId,
      content: content.trim() || (attachment ? `Sent ${messageType === "image" ? "an image" : "a file"}` : ""),
      messageType,
      attachmentUrl,
      attachmentName,
    });

    setContent("");
    clearAttachment();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearAttachment = () => {
    setAttachment(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  return (
    <div className="border-t bg-background">
      {/* Attachment preview */}
      {attachment && (
        <div className="mx-4 mt-3 flex items-center gap-3 p-3 bg-muted rounded-lg">
          {previewUrl ? (
            <img src={previewUrl} alt="Preview" className="h-14 w-14 rounded-md object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-md bg-muted-foreground/20 flex items-center justify-center">
              <Paperclip className="h-6 w-6" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{attachment.name}</p>
            <p className="text-xs text-muted-foreground">
              {(attachment.size / 1024).toFixed(1)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={clearAttachment}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="flex items-end gap-3 p-4">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />

        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          disabled={disabled || isLoading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-5 w-5" />
        </Button>

        <div className="flex-1 relative">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            disabled={disabled || isLoading}
            className={cn(
              "min-h-[44px] max-h-40 resize-none py-3 px-4 text-base rounded-2xl",
              "focus-visible:ring-2 focus-visible:ring-primary"
            )}
            rows={1}
          />
        </div>

        <Button
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          disabled={disabled || isLoading || (!content.trim() && !attachment)}
          onClick={handleSend}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center pb-3">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
