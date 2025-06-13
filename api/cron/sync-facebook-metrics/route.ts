import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookMetricsService } from '@/lib/services/facebook-metrics-service';

export async function GET(request: NextRequest) {
  // Validate API key
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '') || request.nextUrl.searchParams.get('key');
  
  if (!apiKey || apiKey !== process.env.CRON_SECRET_KEY) {
    console.error('Unauthorized cron job request - invalid API key');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  console.log('Starting Facebook metrics sync cron job');

  try {
    const supabase = await createClient();
    
    // Get all Facebook tokens, ordered by created_at descending
    console.log('Fetching Facebook tokens from database');
    const { data: tokens, error: tokensError } = await supabase
      .from('facebook_tokens')
      .select('user_id, access_token, expires_at, has_ad_permissions')
      .order('created_at', { ascending: false });

    if (tokensError) {
      console.error('Error fetching Facebook tokens:', tokensError);
      return NextResponse.json(
        { error: 'Failed to fetch Facebook tokens' },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      console.log('No Facebook tokens found');
      return NextResponse.json({
        success: true,
        message: 'No Facebook tokens to sync',
        results: []
      });
    }

    console.log(`Found ${tokens.length} Facebook tokens`);

    // Group tokens by user_id to get latest token per user
    const latestTokensByUser = new Map();
    for (const token of tokens) {
      if (!latestTokensByUser.has(token.user_id)) {
        // Check if token is expired
        const now = new Date();
        const expiresAt = new Date(token.expires_at);
        
        if (now < expiresAt) {
          latestTokensByUser.set(token.user_id, token);
        }
      }
    }

    console.log(`Processing ${latestTokensByUser.size} unique users with valid tokens`);

    const results = [];
    const metricsService = new FacebookMetricsService(supabase);

    // Process each user
    for (const [userId, token] of latestTokensByUser) {
      console.log(`Processing user: ${userId}`);
      
      try {
        // Fetch user's ad accounts
        const { data: adAccounts, error: adAccountsError } = await supabase
          .from('facebook_ad_accounts')
          .select('id, name')
          .eq('user_id', userId);

        if (adAccountsError) {
          console.error(`Error fetching ad accounts for user ${userId}:`, adAccountsError);
          results.push({
            user_id: userId,
            success: false,
            error: 'Failed to fetch ad accounts',
            ad_accounts_synced: 0
          });
          continue;
        }

        if (!adAccounts || adAccounts.length === 0) {
          console.log(`No ad accounts found for user ${userId}`);
          results.push({
            user_id: userId,
            success: true,
            message: 'No ad accounts to sync',
            ad_accounts_synced: 0
          });
          continue;
        }

        console.log(`Found ${adAccounts.length} ad accounts for user ${userId}`);

        // Sync metrics for each ad account
        const adAccountResults = [];
        for (const adAccount of adAccounts) {
          try {
            console.log(`Syncing metrics for ad account: ${adAccount.id}`);
            const jobId = await metricsService.syncAllMetrics(userId, adAccount.id, token.access_token);
            
            adAccountResults.push({
              ad_account_id: adAccount.id,
              ad_account_name: adAccount.name,
              success: true,
              job_id: jobId
            });
            
            console.log(`Successfully started metrics sync for ad account ${adAccount.id}, job ID: ${jobId}`);
          } catch (adAccountError) {
            console.error(`Error syncing ad account ${adAccount.id}:`, adAccountError);
            adAccountResults.push({
              ad_account_id: adAccount.id,
              ad_account_name: adAccount.name,
              success: false,
              error: adAccountError instanceof Error ? adAccountError.message : 'Unknown error'
            });
          }
        }

        results.push({
          user_id: userId,
          success: true,
          ad_accounts_synced: adAccountResults.filter(r => r.success).length,
          ad_accounts_failed: adAccountResults.filter(r => !r.success).length,
          ad_account_results: adAccountResults
        });

      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        results.push({
          user_id: userId,
          success: false,
          error: userError instanceof Error ? userError.message : 'Unknown error',
          ad_accounts_synced: 0
        });
      }
    }

    // Calculate summary
    const totalUsers = results.length;
    const successfulUsers = results.filter(r => r.success).length;
    const totalAdAccountsSynced = results.reduce((sum, r) => sum + (r.ad_accounts_synced || 0), 0);
    const totalAdAccountsFailed = results.reduce((sum, r) => sum + (r.ad_accounts_failed || 0), 0);

    console.log('Facebook metrics sync cron job completed', {
      totalUsers,
      successfulUsers,
      totalAdAccountsSynced,
      totalAdAccountsFailed
    });

    return NextResponse.json({
      success: true,
      message: 'Facebook metrics sync completed',
      summary: {
        total_users: totalUsers,
        successful_users: successfulUsers,
        failed_users: totalUsers - successfulUsers,
        total_ad_accounts_synced: totalAdAccountsSynced,
        total_ad_accounts_failed: totalAdAccountsFailed
      },
      results
    });

  } catch (error) {
    console.error('Error in Facebook metrics sync cron job:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}