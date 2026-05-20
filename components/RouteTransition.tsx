'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { MouseEvent, ReactNode, useEffect, useRef, useState } from 'react';

const ROUTE_ORDER = ['/', '/muscles', '/program', '/history', '/settings', '/sync'];
const STACK_KEY = 'liftday-route-stack';

interface RouteTransitionProps {
  children: ReactNode;
}

function routeRoot(pathname: string) {
  if (pathname === '/') {
    return '/';
  }

  return `/${pathname.split('/').filter(Boolean)[0]}`;
}

function routeDepth(pathname: string) {
  return pathname.split('/').filter(Boolean).length;
}

function orderedIndex(pathname: string) {
  const index = ROUTE_ORDER.indexOf(routeRoot(pathname));
  return index === -1 ? ROUTE_ORDER.length : index;
}

function readRouteStack(pathname: string) {
  if (typeof window === 'undefined') {
    return [pathname];
  }

  try {
    const value = window.sessionStorage.getItem(STACK_KEY);
    const parsed = value ? JSON.parse(value) : null;

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed.length > 0 ? parsed : [pathname];
    }
  } catch {
    window.sessionStorage.removeItem(STACK_KEY);
  }

  return [pathname];
}

function getDirection(pathname: string, previousPathname: string | null, stack: string[]) {
  if (!previousPathname || previousPathname === pathname) {
    return 1;
  }

  if (stack.length > 1 && stack[stack.length - 2] === pathname) {
    return -1;
  }

  const depthDelta = routeDepth(pathname) - routeDepth(previousPathname);
  if (depthDelta !== 0) {
    return depthDelta > 0 ? 1 : -1;
  }

  return orderedIndex(pathname) >= orderedIndex(previousPathname) ? 1 : -1;
}

function updateRouteStack(pathname: string, stack: string[]) {
  if (stack[stack.length - 1] === pathname) {
    return stack;
  }

  if (stack.length > 1 && stack[stack.length - 2] === pathname) {
    return stack.slice(0, -1);
  }

  const existingIndex = stack.lastIndexOf(pathname);
  const nextStack = existingIndex === -1 ? [...stack, pathname] : stack.slice(0, existingIndex + 1);

  return nextStack.slice(-24);
}

export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const [direction, setDirection] = useState(1);
  const stackRef = useRef<string[]>([]);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    const previousPathname = pathnameRef.current;
    const existingStack = stackRef.current.length > 0 ? stackRef.current : readRouteStack(previousPathname);
    const nextStack = updateRouteStack(pathname, existingStack);

    stackRef.current = nextStack;
    pathnameRef.current = pathname;
    window.sessionStorage.setItem(STACK_KEY, JSON.stringify(nextStack));
  }, [pathname]);

  useEffect(() => {
    const handlePopState = () => {
      setDirection(-1);
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  function handlePointerDown(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    if (target.closest('[aria-label="Back"]')) {
      setDirection(-1);
      return;
    }

    const link = target.closest('a[href]');
    if (!link) {
      setDirection(1);
      return;
    }

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) {
      return;
    }

    const nextPathname = new URL(href, window.location.origin).pathname;
    const routeStack = stackRef.current.length > 0 ? stackRef.current : readRouteStack(pathnameRef.current);

    setDirection(getDirection(nextPathname, pathnameRef.current, routeStack));
  }

  return (
    <AnimatePresence initial={false} mode="wait" custom={direction}>
      <motion.div
        key={pathname}
        custom={direction}
        initial={{ opacity: 0, x: direction * 28, scale: 0.985 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: direction * -18, scale: 0.99 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="h-full min-h-0"
        onPointerDownCapture={handlePointerDown}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
