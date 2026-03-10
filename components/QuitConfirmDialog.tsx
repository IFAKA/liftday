'use client';

import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface QuitConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function QuitConfirmDialog({ open, onOpenChange, onConfirm }: QuitConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>Quit workout?</DialogTitle>
          <DialogDescription>Your progress for this session will be lost.</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-3 sm:flex-row">
          <Button
            variant="outline"
            className="flex-1 rounded-full h-12"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="flex-1 rounded-full h-12"
            onClick={onConfirm}
          >
            Quit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
