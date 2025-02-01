import { Button } from "@/components/ui/button";

interface DialogActionsProps {
  onClose: () => void;
  isSubmitting: boolean;
}

export function DialogActions({ onClose, isSubmitting }: DialogActionsProps) {
  return (
    <div className="flex justify-end space-x-2">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Updating..." : "Update Unit"}
      </Button>
    </div>
  );
}