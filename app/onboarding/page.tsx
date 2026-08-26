'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Onboarding } from '@/components/Onboarding';
import { saveUserProfile, getDefaultProfile } from '@/lib/storage';

const ONBOARDING_KEY = 'liftday_onboarding_completed';

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center bg-black text-fluid-label font-black uppercase tracking-widest text-white/40">Loading setup…</div>}>
      <OnboardingRoute />
    </Suspense>
  );
}

function OnboardingRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawStep = Number(searchParams.get('step') ?? 0);
  const step = Number.isInteger(rawStep) ? Math.min(Math.max(rawStep, 0), 2) : 0;

  const setStep = (nextStep: number) => {
    router.replace(`/onboarding?step=${nextStep}`);
  };

  const handleComplete = () => {
    const result = saveUserProfile(getDefaultProfile());
    if (!result.success) return;
    localStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/');
  };

  return <Onboarding step={step} onStepChange={setStep} onComplete={handleComplete} />;
}
