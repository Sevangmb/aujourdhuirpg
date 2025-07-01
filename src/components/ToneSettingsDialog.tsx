"use client";

import React from 'react';

// This component is intentionally disabled as per the design decision
// to make narrative tone settings only selectable at character creation.
// It is left in place to prevent import errors in other components
// that might still reference it, and it will ensure it remains closed
// if any parent component attempts to open it.
const ToneSettingsDialog: React.FC<{
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ isOpen, onOpenChange }) => {

  React.useEffect(() => {
    if (isOpen) {
      onOpenChange(false);
    }
  }, [isOpen, onOpenChange]);

  return null;
};

export default ToneSettingsDialog;
