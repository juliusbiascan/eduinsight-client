import {
  DialogFooter,
} from '@/renderer/components/ui/dialog';
import { Button } from '@/renderer/components/ui/button';
import { useState, useEffect } from 'react';
import { Modal } from '@/renderer/components/ui/modal';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/renderer/components/ui/select';

interface ShowScreensModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  handleConfirmShowScreens: () => void;
  screenSettings: {
    targetFPS: number;
    quality: number;
    resolution: { width: number; height: number };
    compression: number;
  };
  setScreenSettings: (settings: any) => void;
}

export const ShowScreensModal: React.FC<ShowScreensModalProps> = ({
  isOpen,
  onOpenChange,
  handleConfirmShowScreens,
  screenSettings,
  setScreenSettings,
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
      description="Configure screen sharing settings below:"
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
    >
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Frame Rate</label>
            <Select
              value={screenSettings.targetFPS.toString()}
              onValueChange={(value) => 
                setScreenSettings({
                  ...screenSettings,
                  targetFPS: parseInt(value)
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select FPS" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 FPS (Low)</SelectItem>
                <SelectItem value="20">20 FPS (Medium)</SelectItem>
                <SelectItem value="30">30 FPS (High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Quality</label>
            <Select
              value={screenSettings.quality.toString()}
              onValueChange={(value) =>
                setScreenSettings({
                  ...screenSettings,
                  quality: parseFloat(value)
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0.6">Low (60%)</SelectItem>
                <SelectItem value="0.8">Medium (80%)</SelectItem>
                <SelectItem value="0.9">High (90%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleConfirmShowScreens}>Show</Button>
      </DialogFooter>
    </Modal>
  );
};
