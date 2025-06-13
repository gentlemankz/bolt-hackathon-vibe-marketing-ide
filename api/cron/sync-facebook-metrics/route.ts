import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookMetricsService } from '@/lib/services/facebook-metrics-service';

// This endpoint is designed to be called by a cron job to sync metrics for all users
// Example: Set up a cron job to hit this endpoint every hour
export async function GET(request: NextRequest) {
  try {
    // Authentication via secret key to protect this endpoint
    // The secret key should be set as an environment variable and passed as a query parameter
    const apiKey = request.nextUrl.searchParams.get('key');
    const secretKey = process.env.CRON_SECRET_KEY;
    
    if (!secretKey || apiKey !== secretKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const supabase = await createClient();
    
    // Get all users with Facebook tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('facebook_tokens')
      .select('user_id, access_token')
      .order('created_at', { ascending: false });
    
    if (tokensError) {
      throw new Error(`Failed to fetch tokens: ${tokensError.message}`);
    }
    
    // Group tokens by user_id to get the latest token for each user
    const latestTokens = tokens.reduce((acc, token) => {
      if (!acc[token.user_id]) {
        acc[token.user_id] = token.access_token;
      }
      return acc;
    }, {} as Record<string, string>);
    
    // Create metrics service
    const metricsService = new FacebookMetricsService(supabase);
    
    // Process each user
    const results = [];
    for (const [userId, accessToken] of Object.entries(latestTokens)) {
      try {
        // Get all ad accounts for this user
        const { data: adAccounts, error: adAccountsError } = await supabase
          .from('facebook_ad_accounts')
          .select('id')
          .eq('user_id', userId);
        
        if (adAccountsError) {
          throw new Error(`Failed to fetch ad accounts: ${adAccountsError.message}`);
        }
        
        // Sync metrics for each ad account
        for (const adAccount of adAccounts) {
          try {
            const jobId = await metricsService.syncAllMetrics(userId, adAccount.id, accessToken);
            results.push({
              userId,
              adAccountId: adAccount.id,
              jobId,
              status: 'success'
            });
          } catch (error) {
            results.push({
              userId,
              adAccountId: adAccount.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              status: 'error'
            });
          }
        }
      } catch (error) {
        results.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
          status: 'error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} sync jobs`,
      results
    });
  } catch (error) {
    console.error('Error in cron job:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 