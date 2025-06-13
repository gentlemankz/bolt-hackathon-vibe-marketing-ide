import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Calculate date range (last X days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Determine table name and column based on type
    let tableName: string;
    let entityColumn: string;

    switch (type) {
      case 'campaign':
        tableName = 'facebook_campaign_metrics';
        entityColumn = 'campaign_id';
        break;
      case 'adset':
        tableName = 'facebook_adset_metrics';
        entityColumn = 'ad_set_id';
        break;
      case 'ad':
        tableName = 'facebook_ad_metrics';
        entityColumn = 'ad_id';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid entity type' },
          { status: 400 }
        );
    }

    // Fetch metrics data
    const { data: metrics, error: metricsError } = await supabase
      .from(tableName)
      .select('*')
      .eq(entityColumn, id)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true });

    if (metricsError) {
      console.error('Error fetching metrics:', metricsError);
      return NextResponse.json(
        { error: 'Failed to fetch metrics' },
        { status: 500 }
      );
    }

    if (!metrics || metrics.length === 0) {
      return NextResponse.json({
        summary: {
          impressions: 0,
          clicks: 0,
          reach: 0,
          spend: '0.00',
          cpc: '0.00',
          cpm: '0.00',
          ctr: 0,
          frequency: 0,
          conversions: 0,
          conversion_rate: 0,
          period_start: startDateStr,
          period_end: endDateStr
        }
      });
    }

    // Calculate aggregated metrics manually
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalReach = 0;
    let totalSpend = 0;
    let totalConversions = 0;
    let totalFrequency = 0;

    for (const metric of metrics) {
      totalImpressions += metric.impressions || 0;
      totalClicks += metric.clicks || 0;
      totalReach += metric.reach || 0;
      totalSpend += parseFloat(metric.spend || '0');
      totalConversions += metric.conversions || 0;
      totalFrequency += metric.frequency || 0;
    }

    // Calculate averages and derived metrics
    const avgCpc = totalClicks > 0 ? totalSpend / totalClicks : 0;
    const avgCpm = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0;
    const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const avgFrequency = metrics.length > 0 ? totalFrequency / metrics.length : 0;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const summary = {
      impressions: totalImpressions,
      clicks: totalClicks,
      reach: totalReach,
      spend: totalSpend.toFixed(2),
      cpc: avgCpc.toFixed(2),
      cpm: avgCpm.toFixed(2),
      ctr: parseFloat(avgCtr.toFixed(2)),
      frequency: parseFloat(avgFrequency.toFixed(2)),
      conversions: totalConversions,
      conversion_rate: parseFloat(conversionRate.toFixed(2)),
      period_start: startDateStr,
      period_end: endDateStr
    };

    return NextResponse.json({
      summary
    });

  } catch (error) {
    console.error('Error calculating metrics summary:', error);
    return NextResponse.json(
      { error: 'Failed to calculate metrics summary' },
      { status: 500 }
    );
  }
}