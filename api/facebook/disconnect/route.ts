import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

    // Delete all user's Facebook data from database
    // The order matters due to foreign key constraints
    
    console.log(`Starting Facebook disconnect for user: ${user.id}`);
    
    // 1. Delete sync jobs first (no dependencies)
    const { error: syncJobsError } = await supabase
      .from('facebook_sync_jobs')
      .delete()
      .eq('user_id', user.id);
    
    if (syncJobsError) {
      console.error('Error deleting sync jobs:', syncJobsError);
      return NextResponse.json(
        { error: `Failed to delete sync jobs: ${syncJobsError.message}` },
        { status: 500 }
      );
    }
    
    // 2. Get all ad accounts for this user to handle cascading deletes
    const { data: adAccounts, error: adAccountsFetchError } = await supabase
      .from('facebook_ad_accounts')
      .select('id')
      .eq('user_id', user.id);
    
    if (adAccountsFetchError) {
      console.error('Error fetching ad accounts:', adAccountsFetchError);
      return NextResponse.json(
        { error: `Failed to fetch ad accounts: ${adAccountsFetchError.message}` },
        { status: 500 }
      );
    }
    
    const adAccountIds = adAccounts?.map(account => account.id) || [];
    console.log(`Found ${adAccountIds.length} ad accounts to delete`);
    
    // 3. Delete metrics data first (they reference campaigns, ad sets, and ads)
    if (adAccountIds.length > 0) {
      // Get campaign IDs
      const { data: campaigns } = await supabase
        .from('facebook_campaigns')
        .select('id')
        .in('ad_account_id', adAccountIds);
      
      const campaignIds = campaigns?.map(c => c.id) || [];
      
      // Get ad set IDs
      const { data: adSets } = await supabase
        .from('facebook_ad_sets')
        .select('id')
        .in('campaign_id', campaignIds);
      
      const adSetIds = adSets?.map(as => as.id) || [];
      
      // Get ad IDs
      const { data: ads } = await supabase
        .from('facebook_ads')
        .select('id')
        .in('ad_set_id', adSetIds);
      
      const adIds = ads?.map(a => a.id) || [];
      
      // Delete campaign metrics
      if (campaignIds.length > 0) {
        const { error: campaignMetricsError } = await supabase
          .from('facebook_campaign_metrics')
          .delete()
          .in('campaign_id', campaignIds);
        
        if (campaignMetricsError) {
          console.error('Error deleting campaign metrics:', campaignMetricsError);
        }
      }
      
      // Delete ad set metrics
      if (adSetIds.length > 0) {
        const { error: adsetMetricsError } = await supabase
          .from('facebook_adset_metrics')
          .delete()
          .in('ad_set_id', adSetIds);
        
        if (adsetMetricsError) {
          console.error('Error deleting ad set metrics:', adsetMetricsError);
        }
      }
      
      // Delete ad metrics
      if (adIds.length > 0) {
        const { error: adMetricsError } = await supabase
          .from('facebook_ad_metrics')
          .delete()
          .in('ad_id', adIds);
        
        if (adMetricsError) {
          console.error('Error deleting ad metrics:', adMetricsError);
        }
      }
      
      // 4. Delete ads
      if (adIds.length > 0) {
        const { error: adsError } = await supabase
          .from('facebook_ads')
          .delete()
          .in('id', adIds);
        
        if (adsError) {
          console.error('Error deleting ads:', adsError);
        }
      }
      
      // 5. Delete ad sets
      if (adSetIds.length > 0) {
        const { error: adSetsError } = await supabase
          .from('facebook_ad_sets')
          .delete()
          .in('id', adSetIds);
        
        if (adSetsError) {
          console.error('Error deleting ad sets:', adSetsError);
        }
      }
      
      // 6. Delete campaigns
      if (campaignIds.length > 0) {
        const { error: campaignsError } = await supabase
          .from('facebook_campaigns')
          .delete()
          .in('id', campaignIds);
        
        if (campaignsError) {
          console.error('Error deleting campaigns:', campaignsError);
        }
      }
    }
    
    // 7. Delete ad accounts
    const { error: adAccountsError } = await supabase
      .from('facebook_ad_accounts')
      .delete()
      .eq('user_id', user.id);
    
    if (adAccountsError) {
      console.error('Error deleting ad accounts:', adAccountsError);
      return NextResponse.json(
        { error: `Failed to delete ad accounts: ${adAccountsError.message}` },
        { status: 500 }
      );
    }
    
    // 8. Finally, delete the access tokens
    const { error: tokensError } = await supabase
      .from('facebook_tokens')
      .delete()
      .eq('user_id', user.id);
    
    if (tokensError) {
      console.error('Error deleting tokens:', tokensError);
      return NextResponse.json(
        { error: `Failed to delete access tokens: ${tokensError.message}` },
        { status: 500 }
      );
    }
    
    console.log(`Successfully disconnected Facebook account for user: ${user.id}`);
    
    // Return success response
    return NextResponse.json(
      { message: 'Facebook account disconnected successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error disconnecting Facebook account:', error);
    
    // Detailed error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Disconnect failed: ${errorMessage}` },
      { status: 500 }
    );
  }
} 