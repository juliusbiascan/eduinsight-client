import {
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { useState, useEffect } from 'react';
import { Modal } from '@/renderer/components/ui/modal';

interface ShowScreensModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  handleConfirmShowScreens: () => void;
}

export const ShowScreensModal: React.FC<ShowScreensModalProps> = ({
  isOpen,
  onOpenChange,
  handleConfirmShowScreens,
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <Modal
      title="Show Screens (Beta)"
      description="Are you sure you want to show student screens?"
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
    >
      <DialogFooter>
        <Button onClick={handleConfirmShowScreens}>Show</Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </Modal>
  );
};
