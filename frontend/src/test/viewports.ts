// The viewport table shared by the browser tests.

export type Layout = 'columns' | 'rows';

export const BREAKPOINT_PX = 1024; // 64rem at the browser's default 16px text size
export const SHORT_SCREEN_PX = 480; // 30rem: at this height or less the reel peeks half a row
export const TAP_TARGET_PX = 44; // $tap-target (2.75rem) at default text size

export const VIEWPORTS: Array<[width: number, height: number, represents: string]> = [
  [320, 568, 'small phone'],
  [375, 667, 'phone'],
  [844, 390, 'phone, landscape'],
  [768, 1024, 'tablet, portrait'],
  [1024, 768, 'exactly at the breakpoint'],
  [1025, 768, 'just past the breakpoint'],
  [1180, 820, 'tablet, landscape'],
  [1280, 800, 'laptop'],
  [1920, 1080, 'desktop'],
];

export const expectedLayout = (width: number): Layout => (width > BREAKPOINT_PX ? 'columns' : 'rows');

// How many reel rows peek in above and below the payline.
export const expectedPeek = (height: number) => (height <= SHORT_SCREEN_PX ? 0.5 : 1);
