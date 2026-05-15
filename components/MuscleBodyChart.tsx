'use client';

import { useEffect, useRef } from 'react';
import { BodyChart, ViewSide, type BodyState, type MuscleId } from 'body-muscles';

interface MuscleBodyChartProps {
  view: ViewSide;
  bodyState: BodyState;
  onSelectRegion: (id: MuscleId) => void;
}

export function MuscleBodyChart({ view, bodyState, onSelectRegion }: MuscleBodyChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<BodyChart | null>(null);
  const selectRef = useRef(onSelectRegion);

  useEffect(() => {
    selectRef.current = onSelectRegion;
  }, [onSelectRegion]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    chartRef.current = new BodyChart(container, {
      view: ViewSide.FRONT,
      bodyState: {},
      ariaLabel: 'Muscle map',
      enableTransitions: true,
      onMuscleClick: (id) => selectRef.current(id),
    });
    fitChartToContainer(container);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.update({ view, bodyState });
    if (containerRef.current) fitChartToContainer(containerRef.current);
  }, [view, bodyState]);

  return (
    <div
      ref={containerRef}
      className="muscle-body-chart h-[16rem] w-full overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] sm:h-[20rem]"
    />
  );
}

export { ViewSide };

function fitChartToContainer(container: HTMLElement) {
  const wrapper = container.querySelector<HTMLElement>('.body-chart-container');
  const svg = container.querySelector<SVGSVGElement>('.body-chart-svg');

  wrapper?.style.setProperty('padding', '0.25rem', 'important');
  svg?.style.setProperty('height', '100%', 'important');
  svg?.style.setProperty('width', 'auto', 'important');
  svg?.style.setProperty('max-height', '100%', 'important');
  svg?.style.setProperty('max-width', '100%', 'important');
}
