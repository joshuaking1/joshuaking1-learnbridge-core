// src/app/page.tsx
'use client';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, User } from 'lucide-react';
import Link from 'next/link';

const RoleCard = ({ role, description, icon, href, colorClass }: {
  role: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  colorClass: string;
}) => (
  <Link href={href} className="w-full md:w-1/2 group">
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`relative flex flex-col items-center justify-center min-h-[50vh] md:h-[calc(100vh-4rem)] m-2 md:m-4 rounded-2xl md:rounded-3xl overflow-hidden p-6 md:p-8 text-white ${colorClass}`}
    >
      <div className="z-10 text-center">
        <div className="mb-4 md:mb-6">{icon}</div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-3 md:mb-4 leading-tight">{role}</h2>
        <p className="text-base sm:text-lg md:text-xl max-w-xs md:max-w-sm opacity-90 leading-relaxed">{description}</p>
      </div>
      {/* Always visible on mobile, hover on desktop */}
      <div className="absolute z-10 bottom-6 md:bottom-12 flex items-center justify-center px-4 md:px-6 py-2 md:py-3 bg-white/20 rounded-full backdrop-blur-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-white font-semibold mr-2 text-sm md:text-base">Get Started</span>
        <ArrowRight className="w-4 h-4 md:w-5 md:h-5 text-white" />
      </div>
      {/* Background decorative element */}
      <motion.div
        className="absolute -bottom-10 md:-bottom-20 -right-10 md:-right-20 w-40 h-40 md:w-60 md:h-60 bg-white/10 rounded-full"
        animate={{
          scale: [1, 1.1, 1],
          rotate: [0, 10, 0],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />
    </motion.div>
  </Link>
);

export default function RoleSelectionPage() {
  return (
    <main className="flex flex-col md:flex-row min-h-screen bg-gray-50 p-2 md:p-0">
      <RoleCard
        role="I am a Teacher"
        description="Access AI-powered tools to create engaging lessons and assessments aligned with the SBC."
        icon={<BookOpen size={60} className="md:w-20 md:h-20" />}
        href="/auth/login?role=teacher"
        colorClass="bg-gradient-to-br from-brand-secondary to-blue-900"
      />
      <RoleCard
        role="I am a Student"
        description="Embark on a personalized learning journey with gamified quests and AI tutoring."
        icon={<User size={60} className="md:w-20 md:h-20" />}
        href="/auth/login?role=student"
        colorClass="bg-gradient-to-br from-brand-primary to-orange-600"
      />
    </main>
  );
}