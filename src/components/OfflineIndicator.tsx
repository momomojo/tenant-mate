import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      toast.success("You're back online!", {
        description: "Your data will sync automatically.",
        icon: <Wifi className="h-4 w-4" />,
      });
      setTimeout(() => setShowReconnected(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You're offline", {
        description: "Some features may be limited.",
        icon: <WifiOff className="h-4 w-4" />,
        duration: Infinity,
        id: "offline-toast",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check initial status
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) {
    return null;
  }

  return (
    <div
      className={`fixed bottom-4 left-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
        isOnline
          ? "bg-green-500/90 text-white"
          : "bg-yellow-500/90 text-black"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          <span className="text-sm font-medium">Back online</span>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">Offline mode</span>
        </>
      )}
    </div>
  );
}
