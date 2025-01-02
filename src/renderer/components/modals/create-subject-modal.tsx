import { Input } from '@/renderer/components/ui/input';
import { Label } from '@/renderer/components/ui/label';
import { Textarea } from '@/renderer/components/ui/textarea';
import { Button } from '@/renderer/components/ui/button';
import { useState, useEffect } from 'react';
import { Modal } from '@/renderer/components/ui/modal';
import { DialogFooter } from '@/renderer/components/ui/dialog';

interface CreateSubjectModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  newSubjectName: string;
  setNewSubjectName: (name: string) => void;
  newSubjectCode: string;
  newSubjectDescription: string;
  setNewSubjectDescription: (description: string) => void;
  handleCreateSubject: () => void;
}

export const CreateSubjectModal: React.FC<CreateSubjectModalProps> = ({
  isOpen,
  onOpenChange,
  newSubjectName,
  setNewSubjectName,
  newSubjectCode,
  newSubjectDescription,
  setNewSubjectDescription,
  handleCreateSubject,
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
      title="Create New Subject"
      description="Enter the details of the new subject you want to create."
      isOpen={isOpen}
      onClose={() => onOpenChange(false)}
    >
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input
            id="name"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="col-span-3"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="code" className="text-right">
            Code
          </Label>
          <Input
            id="code"
            value={newSubjectCode}
            readOnly
            className="col-span-3 bg-gray-100"
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="description" className="text-right">
            Description
          </Label>
          <Textarea
            id="description"
            value={newSubjectDescription}
            onChange={(e) => setNewSubjectDescription(e.target.value)}
            className="col-span-3"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={handleCreateSubject}>Create Subject</Button>
      </DialogFooter>
    </Modal>
  );
};
