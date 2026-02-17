import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Golf OS — Turn Your Range Data Into Real Yardages',
  description:
    'Import Garmin R50 shot data, build environment-adjusted yardage cards, analyze dispersion patterns, and practice with strokes-gained scoring. Free forever.',
  openGraph: {
    title: 'Golf OS — Your Range Data Is Worth More Than Averages',
    description:
      'Precise yardage cards, dispersion analysis, structured practice plans, and equipment labs — all from your Garmin R50 data.',
    type: 'website',
  },
};

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
