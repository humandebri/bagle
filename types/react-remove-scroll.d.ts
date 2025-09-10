declare module 'react-remove-scroll' {
  import type { ComponentType, ReactNode } from 'react';

  export interface RemoveScrollProps {
    children?: ReactNode;
    enabled?: boolean;
    removeScrollBar?: boolean;
    allowPinchZoom?: boolean;
    shards?: Array<Element | null | undefined>;
    inert?: boolean;
    className?: string;
  }

  export const RemoveScroll: ComponentType<RemoveScrollProps>;
  export default RemoveScroll;
}

