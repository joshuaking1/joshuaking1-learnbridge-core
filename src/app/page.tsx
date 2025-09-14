// src/app/page.tsx
'use client';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, User } from 'lucide-react';
import Link from 'next/link';

const RoleCard = ({ role, description, icon, href, colorClass }) => (
  <Link href={href} className="w-full md:w-1/2 group">
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`relative flex flex-col items-center justify-center h-[calc(100vh-2rem)] md:h-[calc(100vh-4rem)] m-4 rounded-3xl overflow-hidden p-8 text-white ${colorClass}`}
    >
      <div className="z-10 text-center">
        <div className="mb-6">{icon}</div>
        <h2 className="text-5xl md:text-6xl font-extrabold mb-4">{role}</h2>
        <p className="text-lg md:text-xl max-w-sm opacity-90">{description}</p>
      </div>
      <div className="absolute z-10 bottom-12 flex items-center justify-center px-6 py-3 bg-white/20 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <span className="text-white font-semibold mr-2">Get Started</span>
        <ArrowRight className="w-5 h-5 text-white" />
      </div>
      {/* Background decorative element */}
      <motion.div
        className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full"
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
    <main className="flex flex-col md:flex-row min-h-screen bg-gray-50">
      <RoleCard
        role="I am a Teacher"
        description="Access AI-powered tools to create engaging lessons and assessments aligned with the SBC."
        icon={<BookOpen size={80} />}
        href="/auth/login?role=teacher"
        colorClass="bg-gradient-to-br from-brand-secondary to-blue-900"
      />
      <RoleCard
        role="I am a Student"
        description="Embark on a personalized learning journey with gamified quests and AI tutoring."
        icon={<User size={80} />}
        href="/auth/login?role=student"
        colorClass="bg-gradient-to-br from-brand-primary to-orange-600"
      />
    </main>
  );
}