import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { nasaAPI } from '@/lib/api/nasa-api'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: asteroidId } = await context.params;
    const searchParams = request.nextUrl.searchParams;
    const noCache = searchParams.get('noCache') === 'true';

    console.log(`[Asteroid Details API] Fetching asteroid ID: ${asteroidId}`);

    const asteroid = await nasaAPI.getAsteroidById(asteroidId, !noCache);

    if (!asteroid) {
      return NextResponse.json(
        {
          error: 'Asteroid not found',
          timestamp: Date.now(),
        },
        { status: 404 }
      );
    }

    const normalized = nasaAPI.normalizeAsteroid(asteroid);

    console.log(`[Asteroid Details API] Found: ${asteroid.name}`);

    return NextResponse.json({
      asteroid: normalized,
      raw: asteroid,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Asteroid details API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
