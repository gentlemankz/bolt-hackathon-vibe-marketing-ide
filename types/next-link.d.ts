// Type declarations for Next.js Link
declare module 'next/link' {
  import { ComponentProps, ReactNode } from 'react';

  interface LinkProps {
    href: string | URL;
    as?: string | URL;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
    locale?: string | false;
    legacyBehavior?: boolean;
    onMouseEnter?: (e: React.MouseEvent) => void;
    onTouchStart?: (e: React.TouchEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
    className?: string;
    children: ReactNode;
  }

  declare const Link: React.ForwardRefExoticComponent<
    LinkProps & React.RefAttributes<HTMLAnchorElement>
  >;

  export default Link;
} 