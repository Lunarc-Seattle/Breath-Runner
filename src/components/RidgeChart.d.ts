import type { JSX, RefObject } from 'react';

export interface RidgeChartProps {
  values: (number | null)[];
  min: number;
  max: number;
  height?: number;
  ticks?: number[];
  tickFormat?: (v: number) => string;
  xlabels?: [number, string][];
  pines?: number[];
  target?: { value: number; label?: string } | null;
  dots?: boolean;
  compact?: boolean;
  label?: string;
  svgRef?: RefObject<SVGSVGElement | null>;
}

export function RidgeChart(props: RidgeChartProps): JSX.Element | null;

export interface PineIconProps {
  className?: string;
}

export function PineIcon(props: PineIconProps): JSX.Element;
