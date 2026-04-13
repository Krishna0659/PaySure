import React, { Suspense } from 'react';
import { motion } from 'framer-motion';

const LoaderFallback = () => (
  <div style={{
    minHeight: '100%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  }}>
    <motion.div
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width: 48,
        height: 48,
        borderRadius: '50%',
        background: 'rgba(52, 211, 153, 0.1)',
        boxShadow: '0 0 20px rgba(52, 211, 153, 0.4)',
        border: '2px solid rgba(52, 211, 153, 0.8)'
      }}
    />
  </div>
);

export const SuspenseLoader = ({ children }) => {
  return (
    <Suspense fallback={<LoaderFallback />}>
      {children}
    </Suspense>
  );
};

export default SuspenseLoader;
