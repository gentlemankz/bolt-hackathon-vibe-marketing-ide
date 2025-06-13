import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookMetricsService } from '@/lib/services/facebook-metrics-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const days = searchParams.get('days') || '30';

    if (!type || !id) {
      return NextResponse.json(
        { error: 'Type and ID parameters are required' },
        { status: 400 }
      );
    }

    // Validate entity type
    const validTypes = ['campaign', 'adset', 'ad'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Must be campaign, adset, or ad' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Initialize metrics service
    const metricsService = new FacebookMetricsService(supabase);

    // Fetch metrics based on type
    let metrics;
    switch (type) {
      case 'campaign':
        metrics = await metricsService.getCampaignMetrics(id, parseInt(days));
        break;
      case 'adset':
        metrics = await metricsService.getAdSetMetrics(id, parseInt(days));
        break;
      case 'ad':
        metrics = await metricsService.getAdMetrics(id, parseInt(days));
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid entity type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      metrics: metrics || []
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}