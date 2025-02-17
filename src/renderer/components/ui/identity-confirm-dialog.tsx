import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './dialog';
import { Input } from './input';
import { Button } from './button';
import { Label } from './label';

interface IdentityConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (firstName: string, lastName: string) => Promise<void>;
  attempts: number;
  maxAttempts: number;
}

const IdentityConfirmDialog: React.FC<IdentityConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  attempts,
  maxAttempts,
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await onConfirm(firstName, lastName);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getAttemptsWarning = () => {
    if (attempts === 0) return null;
    
    const remainingAttempts = maxAttempts - attempts;
    const attemptsText = `${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining`;
    
    let warningClass = 'mt-2 ';
    if (remainingAttempts <= 2) {
      warningClass += 'text-red-500 font-semibold';
    } else {
      warningClass += 'text-yellow-500';
    }

    return (
      <p className={warningClass}>
        Failed attempts: {attempts}/{maxAttempts} ({attemptsText})
      </p>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Your Identity</DialogTitle>
          <DialogDescription>
            Please enter your full name exactly as registered.
            {getAttemptsWarning()}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Enter your first name"
              required
            />
          </div>

          <div>
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Enter your last name"
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || attempts >= maxAttempts}
          >
            {isLoading ? 'Verifying...' : 'Confirm Identity'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default IdentityConfirmDialog;
