import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adAccountId = searchParams.get('adAccountId');

    console.log('🔍 Facebook Pages API: Starting request for ad account:', adAccountId);

    if (!adAccountId) {
      return NextResponse.json(
        { error: 'Ad account ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.log('❌ Authentication failed:', userError);
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('✅ User authenticated:', user.id);

    // Verify user owns this ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id, name')
      .eq('id', adAccountId)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccount) {
      console.log('❌ Ad account verification failed:', adAccountError);
      return NextResponse.json(
        { error: 'Ad account not found or access denied' },
        { status: 403 }
      );
    }

    console.log('✅ Ad account verified:', adAccount.name);

    // Get Facebook access token
    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);
    
    if (!accessToken) {
      console.log('❌ No Facebook access token found');
      return NextResponse.json(
        { error: 'Facebook account not connected' },
        { status: 401 }
      );
    }

    console.log('✅ Facebook access token retrieved');

    // Initialize response structure
    const response = {
      facebook_pages: [],
      instagram_accounts: [],
      total_facebook_pages: 0,
      total_instagram_accounts: 0,
      has_more_facebook_pages: false,
      has_more_instagram_accounts: false,
      default_facebook_page: null,
      default_instagram_account: null,
      debug_info: {
        methods_tried: [],
        errors_encountered: [],
        sources: {}
      }
    };

    // Method 1: Try promote_pages endpoint
    console.log('🔍 Method 1: Trying promote_pages endpoint');
    try {
      const promoteUrl = `https://graph.facebook.com/v23.0/${adAccountId}/promote_pages?access_token=${accessToken}&fields=id,name,category`;
      console.log('📡 Fetching from promote_pages:', promoteUrl);
      
      const promoteResponse = await fetch(promoteUrl);
      response.debug_info.methods_tried.push('promote_pages');
      
      if (promoteResponse.ok) {
        const promoteData = await promoteResponse.json();
        console.log('✅ promote_pages response:', promoteData);
        
        if (promoteData.data && Array.isArray(promoteData.data)) {
          const pages = promoteData.data.map(page => ({
            id: page.id,
            name: page.name,
            category: page.category || 'Unknown',
            type: 'facebook_page'
          }));
          
          response.facebook_pages.push(...pages);
          response.debug_info.sources.promote_pages = pages.length;
          console.log(`✅ Found ${pages.length} pages from promote_pages`);
        }
      } else {
        const errorData = await promoteResponse.json();
        console.log('❌ promote_pages failed:', errorData);
        response.debug_info.errors_encountered.push({
          method: 'promote_pages',
          error: errorData.error?.message || 'Unknown error'
        });
      }
    } catch (error) {
      console.log('❌ promote_pages exception:', error);
      response.debug_info.errors_encountered.push({
        method: 'promote_pages',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Method 2: Try user accounts endpoint
    console.log('🔍 Method 2: Trying user accounts endpoint');
    try {
      const accountsUrl = `https://graph.facebook.com/v23.0/me/accounts?access_token=${accessToken}&fields=id,name,category,access_token`;
      console.log('📡 Fetching from user accounts:', accountsUrl);
      
      const accountsResponse = await fetch(accountsUrl);
      response.debug_info.methods_tried.push('user_accounts');
      
      if (accountsResponse.ok) {
        const accountsData = await accountsResponse.json();
        console.log('✅ user accounts response:', accountsData);
        
        if (accountsData.data && Array.isArray(accountsData.data)) {
          const pages = accountsData.data.map(page => ({
            id: page.id,
            name: page.name,
            category: page.category || 'Unknown',
            type: 'facebook_page'
          }));
          
          // Merge with existing pages (avoid duplicates)
          const existingIds = new Set(response.facebook_pages.map(p => p.id));
          const newPages = pages.filter(p => !existingIds.has(p.id));
          
          response.facebook_pages.push(...newPages);
          response.debug_info.sources.user_accounts = newPages.length;
          console.log(`✅ Found ${newPages.length} new pages from user accounts`);
        }
      } else {
        const errorData = await accountsResponse.json();
        console.log('❌ user accounts failed:', errorData);
        response.debug_info.errors_encountered.push({
          method: 'user_accounts',
          error: errorData.error?.message || 'Unknown error'
        });
      }
    } catch (error) {
      console.log('❌ user accounts exception:', error);
      response.debug_info.errors_encountered.push({
        method: 'user_accounts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Method 3: Try Instagram accounts
    console.log('🔍 Method 3: Trying Instagram accounts');
    try {
      const instagramUrl = `https://graph.facebook.com/v23.0/me/accounts?access_token=${accessToken}&fields=id,name,instagram_business_account{id,name,username,profile_picture_url,followers_count,media_count}`;
      console.log('📡 Fetching Instagram accounts:', instagramUrl);
      
      const instagramResponse = await fetch(instagramUrl);
      response.debug_info.methods_tried.push('instagram_accounts');
      
      if (instagramResponse.ok) {
        const instagramData = await instagramResponse.json();
        console.log('✅ Instagram accounts response:', instagramData);
        
        if (instagramData.data && Array.isArray(instagramData.data)) {
          for (const page of instagramData.data) {
            if (page.instagram_business_account) {
              const igAccount = page.instagram_business_account;
              response.instagram_accounts.push({
                id: igAccount.id,
                name: igAccount.name || igAccount.username,
                username: igAccount.username,
                type: 'instagram_account',
                connected_facebook_page: page.id,
                profile_picture_url: igAccount.profile_picture_url,
                followers_count: igAccount.followers_count,
                media_count: igAccount.media_count
              });
            }
          }
          
          response.debug_info.sources.instagram = response.instagram_accounts.length;
          console.log(`✅ Found ${response.instagram_accounts.length} Instagram accounts`);
        }
      } else {
        const errorData = await instagramResponse.json();
        console.log('❌ Instagram accounts failed:', errorData);
        response.debug_info.errors_encountered.push({
          method: 'instagram_accounts',
          error: errorData.error?.message || 'Unknown error'
        });
      }
    } catch (error) {
      console.log('❌ Instagram accounts exception:', error);
      response.debug_info.errors_encountered.push({
        method: 'instagram_accounts',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Set totals and defaults
    response.total_facebook_pages = response.facebook_pages.length;
    response.total_instagram_accounts = response.instagram_accounts.length;
    
    if (response.facebook_pages.length > 0) {
      response.default_facebook_page = response.facebook_pages[0].id;
    }
    
    if (response.instagram_accounts.length > 0) {
      response.default_instagram_account = response.instagram_accounts[0].id;
    }

    console.log('📊 Final response summary:', {
      facebook_pages: response.total_facebook_pages,
      instagram_accounts: response.total_instagram_accounts,
      methods_tried: response.debug_info.methods_tried.length,
      errors: response.debug_info.errors_encountered.length
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in Facebook pages route:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Facebook pages' },
      { status: 500 }
    );
  }
}