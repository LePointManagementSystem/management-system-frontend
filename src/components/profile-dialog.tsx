import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { DialogHeader } from './ui/dialog';

import { Button } from '@/components/ui/button';
import UserProfilePage from '@/pages/user-profile-pafge';

interface ProfileDialogProps {
    onClose: () => void;
}

const ProfileDialog: React.FC<ProfileDialogProps> = ({ onClose }) => (
    <Dialog open>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>User Profile</DialogTitle>
            </DialogHeader>
            <UserProfilePage />
            <Button variant="secondary" onClick={onClose}>
                Close
            </Button>
        </DialogContent>
    </Dialog>
);

export default ProfileDialog;
