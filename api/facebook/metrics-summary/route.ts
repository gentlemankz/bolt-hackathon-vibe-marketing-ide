import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);
    
    const formattedStartDate = startDate.toISOString().split('T')[0];
    const formattedEndDate = endDate.toISOString().split('T')[0];

    // Query the database for metrics data
    let tableName = '';
    let columnName = '';
    
    if (entityType === 'campaign') {
      tableName = 'facebook_campaign_metrics';
      columnName = 'campaign_id';
    } else if (entityType === 'adset') {
      tableName = 'facebook_adset_metrics';
      columnName = 'ad_set_id';
    } else if (entityType === 'ad') {
      tableName = 'facebook_ad_metrics';
      columnName = 'ad_id';
    }
    
    // Fetch the metrics data from the database
    const { data: metricsData, error } = await supabase
      .from(tableName)
      .select('*')
      .eq(columnName, entityId)
      .gte('date', formattedStartDate)
      .lte('date', formattedEndDate);
    
    if (error) {
      console.error('Error fetching metrics data:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    // Calculate summaries manually
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalReach = 0;
    let totalFrequency = 0;
    let totalConversions = 0;
    
    metricsData.forEach(metric => {
      totalImpressions += metric.impressions || 0;
      totalClicks += metric.clicks || 0;
      totalSpend += parseFloat(metric.spend || '0');
      totalReach += metric.reach || 0;
      totalFrequency += metric.frequency || 0;
      totalConversions += metric.conversions || 0;
    });
    
    // Calculate averages and rates
    const avgFrequency = metricsData.length > 0 ? (totalFrequency / metricsData.length) : 0;
    const totalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const totalCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    
    // Prepare the response
    const summary = {
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_spend: totalSpend.toFixed(2),
      total_reach: totalReach,
      avg_frequency: avgFrequency.toFixed(2),
      total_conversions: totalConversions,
      total_ctr: totalCtr.toFixed(2),
      total_cpc: totalCpc.toFixed(2)
    };

    // Return metrics summary
    return NextResponse.json({ summary });
  } catch (error) {
    console.error('Error fetching Facebook metrics summary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 