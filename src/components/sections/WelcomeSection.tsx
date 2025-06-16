
"use client";

import React from 'react';
import WelcomeMessage from '@/components/WelcomeMessage';

const WelcomeSection: React.FC = () => {
  return (
    <div className="flex-grow flex items-center justify-center">
      <WelcomeMessage />
    </div>
  );
};

export default WelcomeSection;
