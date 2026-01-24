import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useGetSignUrl } from "@/hooks/useLeases";
import { useToast } from "@/hooks/use-toast";

interface SignLeaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  signatureId: string | null;
  clientId: string;
  onSignComplete?: () => void;
}

export function SignLeaseDialog({
  open,
  onOpenChange,
  signatureId,
  clientId,
  onSignComplete,
}: SignLeaseDialogProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "signing" | "signed" | "declined" | "error">("loading");
  const getSignUrl = useGetSignUrl();

  useEffect(() => {
    if (!open || !signatureId) return;

    let mounted = true;

    async function initSigning() {
      try {
        setStatus("loading");

        // Get the sign URL
        const result = await getSignUrl.mutateAsync(signatureId!);

        if (!mounted) return;

        // Dynamically import hellosign-embedded (it's a browser-only module)
        const HelloSign = (await import("hellosign-embedded")).default;

        if (!mounted) return;

        // Create client instance
        const client = new HelloSign();
        clientRef.current = client;

        // Open the signing UI
        client.open(result.signUrl, {
          clientId,
          skipDomainVerification: true,
        });

        setStatus("signing");

        // Listen for events
        client.on("sign", () => {
          setStatus("signed");
          toast({
            title: "Lease signed",
            description: "You have successfully signed the lease agreement.",
          });
          onSignComplete?.();
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
        });

        client.on("decline", () => {
          setStatus("declined");
          toast({
            title: "Lease declined",
            description: "You have declined to sign the lease agreement.",
            variant: "destructive",
          });
          setTimeout(() => {
            onOpenChange(false);
          }, 2000);
        });

        client.on("cancel", () => {
          onOpenChange(false);
        });

        client.on("error", (data: { code: string; description: string }) => {
          console.error("HelloSign error:", data);
          setStatus("error");
          toast({
            title: "Signing error",
            description: data.description || "An error occurred during signing.",
            variant: "destructive",
          });
        });

        client.on("close", () => {
          onOpenChange(false);
        });
      } catch (error) {
        if (mounted) {
          setStatus("error");
          console.error("Failed to initialize signing:", error);
          toast({
            title: "Error",
            description: "Failed to load the signing interface. Please try again.",
            variant: "destructive",
          });
        }
      }
    }

    initSigning();

    return () => {
      mounted = false;
      if (clientRef.current) {
        try {
          clientRef.current.close();
        } catch {
          // Ignore close errors on cleanup
        }
        clientRef.current = null;
      }
    };
  }, [open, signatureId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl min-h-[600px]">
        <DialogHeader>
          <DialogTitle>Sign Lease Agreement</DialogTitle>
          <DialogDescription>
            Review and sign the lease agreement below.
          </DialogDescription>
        </DialogHeader>

        <div ref={containerRef} className="flex-1 min-h-[500px] flex items-center justify-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading signing interface...</p>
            </div>
          )}

          {status === "signed" && (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
              <p className="text-lg font-medium">Lease Signed Successfully</p>
              <p className="text-sm text-muted-foreground">The signed document will be available shortly.</p>
            </div>
          )}

          {status === "declined" && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="text-lg font-medium">Lease Declined</p>
              <p className="text-sm text-muted-foreground">You have declined to sign this lease.</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-3">
              <XCircle className="h-12 w-12 text-red-600" />
              <p className="text-lg font-medium">Error Loading</p>
              <p className="text-sm text-muted-foreground">Failed to load the signing interface.</p>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
