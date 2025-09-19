// src/lib/icon-map.tsx
import { 
  LayoutDashboard, 
  BookText, 
  FileText, 
  Library, 
  LineChart, 
  BarChart, 
  MessageSquare, 
  Bot,
  Swords,
  Trophy,
  User,
  Shield,
  Home,
  Users,
  BookCopy,
  Cpu,
  type LucideIcon
} from 'lucide-react';

// Map of icon names to components
const iconMap: Record<string, LucideIcon> = {
  'LayoutDashboard': LayoutDashboard,
  'BookText': BookText,
  'FileText': FileText,
  'Library': Library,
  'LineChart': LineChart,
  'BarChart': BarChart,
  'MessageSquare': MessageSquare,
  'Bot': Bot,
  'Swords': Swords,
  'Trophy': Trophy,
  'User': User,
  'Shield': Shield,
  'Home': Home,
  'Users': Users,
  'BookCopy': BookCopy,
  'Cpu': Cpu,
};

export function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || LayoutDashboard; // Default fallback
}

// Server-side icon renderer for layouts
export function ServerIcon({ iconName, className }: { iconName: string; className?: string }) {
  const IconComponent = getIcon(iconName);
  return <IconComponent className={className} />;
}
