import { useEffect } from 'react';
import { useFirstTimePermissions } from '@/hooks/useFirstTimePermissions';

export const FirstTimePermissions = () => {
  const { isFirstTime, isInitialized, requestInitialPermissions } = useFirstTimePermissions();

  useEffect(() => {
    if (isInitialized && isFirstTime) {
      // Small delay to ensure app is fully loaded
      const timer = setTimeout(() => {
        requestInitialPermissions();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isInitialized, isFirstTime, requestInitialPermissions]);

  // This component doesn't render anything visible
  return null;
};