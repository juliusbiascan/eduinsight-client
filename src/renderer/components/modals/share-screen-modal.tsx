import { Button } from '@/renderer/components/ui/button';
import { useState, useEffect } from 'react';
import { Modal } from '@/renderer/components/ui/modal';
import { DialogFooter } from '@/renderer/components/ui/dialog';

interface ShareScreenModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  handleConfirmShareScreen: () => void;
}

export const ShareScreenModal: React.FC<ShareScreenModalProps> = ({
  isOpen,
  onOpenChange,
  handleConfirmShareScreen,
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
      title="Share Screen (Beta)"
      description="Are you sure you want to share your screen with students?"
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
    >
      <DialogFooter>
        <Button onClick={handleConfirmShareScreen}>Share</Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </Modal>
  );
};
