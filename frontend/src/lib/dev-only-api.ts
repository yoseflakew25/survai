import { NextResponse } from 'next/server';

/** Legacy mock route handlers — disabled in production builds. */
export function rejectMockApiInProduction() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ detail: 'Not found' }, { status: 404 });
  }
  return null;
}