// src/components/shared/mobile-sidebar.tsx
'use client';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { getIcon } from '@/lib/icon-map';

interface NavLink {
  href: string;
  label: string;
  iconName: string;
}

interface MobileSidebarProps {
  navLinks: NavLink[];
  children?: React.ReactNode;
  title?: string;
  logo?: React.ReactNode;
}

export function MobileSidebar({ navLinks, children, title = "Navigation", logo }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 md:hidden"
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            {logo}
            <span>{title}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto">
          {children && (
            <div className="border-b">
              {children}
            </div>
          )}
          <nav className="flex flex-col gap-2 px-2 py-4">
            {navLinks.map((link) => {
              const IconComponent = getIcon(link.iconName);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 hover:bg-gray-100"
                >
                  <IconComponent className="h-5 w-5" />
                  <span>{link.label}</span>
                </a>
              );
            })}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
}
