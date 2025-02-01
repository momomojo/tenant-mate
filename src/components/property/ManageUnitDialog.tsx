import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UnitUpdateForm } from "./UnitUpdateForm";

interface ManageUnitDialogProps {
  unit: any;
  isOpen: boolean;
  onClose: () => void;
  onUnitUpdated: () => void;
}

export function ManageUnitDialog({
  unit,
  isOpen,
  onClose,
  onUnitUpdated,
}: ManageUnitDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Unit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <UnitUpdateForm
            unit={unit}
            onClose={onClose}
            onUnitUpdated={onUnitUpdated}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}