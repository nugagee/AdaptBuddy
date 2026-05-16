import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useUiStore } from 'store/uiStore';

const MAX_TILT = 10;
const LIFT_SCALE = 1.02;

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  as?: 'article' | 'div';
}

const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  as: Tag = 'article',
}) => {
  const cardRef = useRef<HTMLElement>(null);
  const reducedMotionPref = useUiStore((s) => s.reducedMotion);
  const [isHovering, setIsHovering] = useState(false);
  const [transform, setTransform] = useState(
    'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
  );

  const [systemReducedMotion, setSystemReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const motionDisabled = reducedMotionPref || systemReducedMotion;

  const resetTransform = useCallback(() => {
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    setIsHovering(false);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (motionDisabled || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;

      const rotateY = x * MAX_TILT * 2;
      const rotateX = -y * MAX_TILT * 2;

      setTransform(
        `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(${LIFT_SCALE}, ${LIFT_SCALE}, ${LIFT_SCALE})`
      );
      setIsHovering(true);
    },
    [motionDisabled]
  );

  const handleMouseEnter = useCallback(() => {
    if (!motionDisabled) setIsHovering(true);
  }, [motionDisabled]);

  return (
    <Tag
      ref={cardRef as React.RefObject<HTMLDivElement & HTMLElement>}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={resetTransform}
      style={{
        transform: motionDisabled ? undefined : transform,
        transition: motionDisabled
          ? undefined
          : isHovering
            ? 'transform 0.1s ease-out'
            : 'transform 0.45s cubic-bezier(0.23, 1, 0.32, 1)',
        transformStyle: 'preserve-3d',
        willChange: motionDisabled ? undefined : 'transform',
      }}
      className={className}
    >
      {children}
    </Tag>
  );
};

export default TiltCard;
