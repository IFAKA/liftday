'use client';

import { useRouter } from 'next/navigation';
import { Onboarding } from '@/components/Onboarding';
import { saveUserProfile, getDefaultProfile } from '@/lib/storage';

const ONBOARDING_KEY = 'liftday_onboarding_completed';

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    saveUserProfile(getDefaultProfile());
    router.replace('/');
  };

  return <Onboarding onComplete={handleComplete} />;
}
