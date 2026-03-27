"use client";

/* Sidebar is removed in the editorial redesign.
   Component kept as no-op for backward compatibility with page.tsx props. */

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string, ctx?: any) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar(_props: SidebarProps) {
  return null;
}
