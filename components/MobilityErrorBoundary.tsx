'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { traceLiftDay } from '@/lib/debug-trace';

interface MobilityErrorBoundaryProps {
  children: ReactNode;
  onQuit: () => void;
  onSkip: () => void;
}

interface MobilityErrorBoundaryState {
  hasError: boolean;
}

export class MobilityErrorBoundary extends Component<MobilityErrorBoundaryProps, MobilityErrorBoundaryState> {
  state: MobilityErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): MobilityErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    traceLiftDay('mobility.render.error', {
      message: error.message,
      stack: error.stack ?? null,
    });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex h-full flex-col items-center justify-between bg-black px-safe pt-safe pb-safe text-white">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <h1 className="text-fluid-exercise font-black uppercase leading-tight text-white">
            Mobility Paused
          </h1>
          <p className="mt-3 text-fluid-label font-bold uppercase leading-relaxed text-white/50">
            Screen failed to draw
          </p>
        </div>

        <div className="mb-4 flex w-full shrink-0 flex-col gap-4 px-4 pb-safe">
          <Button
            onClick={() => {
              this.setState({ hasError: false });
              this.props.onSkip();
            }}
            className="w-full btn-mobile-accessible rounded-full bg-white font-black uppercase tracking-tight text-black shadow-xl active:scale-95"
          >
            Skip Exercise
          </Button>
          <Button
            variant="outline"
            onClick={this.props.onQuit}
            className="w-full btn-mobile-secondary rounded-full border-0 bg-white/5 text-fluid-label font-black uppercase tracking-widest text-white/50 active:bg-white/10 active:scale-95"
          >
            Quit Mobility
          </Button>
        </div>
      </div>
    );
  }
}
