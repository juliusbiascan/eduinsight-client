import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Button } from '@/renderer/components/ui/button';
import { useState, useEffect } from 'react';
import { Modal } from '@/renderer/components/ui/modal';
import { DialogFooter } from '@/renderer/components/ui/dialog';

interface WebpageModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  webpageUrl: string;
  setWebpageUrl: (url: string) => void;
  handleLaunchWebpage: () => void;
}

export const WebpageModal: React.FC<WebpageModalProps> = ({
  isOpen,
  onOpenChange,
  webpageUrl,
  setWebpageUrl,
  handleLaunchWebpage,
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
      title="Launch Webpage"
      description="Enter the URL of the webpage you want to launch on student devices."
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
    >
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="webpage-url" className="text-right">
            URL
          </Label>
          <Input
            id="webpage-url"
            value={webpageUrl}
            onChange={(e) => setWebpageUrl(e.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleLaunchWebpage}>Launch</Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </DialogFooter>
    </Modal>
  );
};
