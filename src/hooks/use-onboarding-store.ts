// src/hooks/use-onboarding-store.ts
import { create } from 'zustand';

interface OnboardingState {
  formData: Record<string, any>;
  updateFormData: (data: Record<string, any>) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  formData: {},
  updateFormData: (data) => set((state) => ({ formData: { ...state.formData, ...data } })),
  reset: () => set({ formData: {} }),
}));