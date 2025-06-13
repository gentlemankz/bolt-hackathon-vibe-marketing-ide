import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookMetricsService } from '@/lib/services/facebook-metrics-service';

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the query parameters
    const searchParams = request.nextUrl.searchParams;
    const entityType = searchParams.get('type'); // 'campaign', 'adset', or 'ad'
    const entityId = searchParams.get('id');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: 'Entity type and ID are required' },
        { status: 400 }
      );
    }

    // Validate entity type
    if (!['campaign', 'adset', 'ad'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type. Must be "campaign", "adset", or "ad"' },
        { status: 400 }
      );
    }

    // Create metrics service
    const metricsService = new FacebookMetricsService(supabase);
    
    // Fetch metrics based on entity type
    let metrics: unknown[] = [];
    
    if (entityType === 'campaign') {
      metrics = await metricsService.getCampaignMetrics(entityId, days);
    } else if (entityType === 'adset') {
      metrics = await metricsService.getAdSetMetrics(entityId, days);
    } else if (entityType === 'ad') {
      metrics = await metricsService.getAdMetrics(entityId, days);
    }

    // Return metrics
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching Facebook metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 