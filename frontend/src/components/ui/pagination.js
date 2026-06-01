import * as React from 'react';
import { MoreHorizontal } from 'lucide-react';

function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

const Pagination = ({ className, ...props }) => (
  <nav
    data-slot="pagination"
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);

function PaginationContent({ className, ...props }) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}
      {...props}
    />
  );
}

function PaginationItem({ className, ...props }) {
  return (
    <li data-slot="pagination-item" className={cn('', className)} style={{ listStyle: 'none', margin: 0, padding: 0 }} {...props} />
  );
}

const PaginationEllipsis = ({ className, ...props }) => (
  <span
    data-slot="pagination-ellipsis"
    aria-hidden
    className={cn('flex h-9 w-9 items-center justify-center', className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
);

export { Pagination, PaginationContent, PaginationEllipsis, PaginationItem };
