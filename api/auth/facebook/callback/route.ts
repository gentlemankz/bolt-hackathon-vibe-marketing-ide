import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForToken, FACEBOOK_SCOPES } from '@/lib/meta-api';

export async function GET(request: NextRequest) {
  try {
    // Get code from query string
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const error_reason = searchParams.get('error_reason');
    const error_description = searchParams.get('error_description');

    // Redirect URL for success or error
    const redirectUrl = new URL('/facebook/select-adaccount', request.url);
    const errorUrl = new URL('/', request.url);
    errorUrl.searchParams.set('error', 'facebook_auth_failed');

    // Handle errors
    if (error || !code) {
      console.error('Facebook auth error:', error, error_reason, error_description);
      return NextResponse.redirect(errorUrl);
    }

    // Exchange code for token
    const tokenData = await exchangeCodeForToken(code);
    console.log('Facebook token obtained with scopes:', FACEBOOK_SCOPES);
    
    // Calculate token expiration
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + tokenData.expires_in);

    // Get user from session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('No authenticated user found when storing Facebook token');
      errorUrl.searchParams.set('error', 'no_user');
      return NextResponse.redirect(errorUrl);
    }

    // Verify the token has ads_read and ads_management permissions
    let hasRequiredPermissions = false;
    try {
      // Verify permissions by making a test API call to check ad accounts
      const testResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/adaccounts?fields=id,name&access_token=${tokenData.access_token}&limit=1`
      );
      
      if (testResponse.ok) {
        console.log('Token successfully verified with ads_read permission');
        hasRequiredPermissions = true;
      } else {
        const errorData = await testResponse.json();
        console.warn('Token is missing required permissions:', errorData);
        
        // If it's a permission error, redirect to error page
        if (errorData.error && (
            errorData.error.code === 200 || 
            errorData.error.message.includes('permission')
        )) {
          errorUrl.searchParams.set('error', 'missing_permissions');
          errorUrl.searchParams.set('error_description', 'The Facebook account needs to grant ads_management and ads_read permissions');
          return NextResponse.redirect(errorUrl);
        }
      }
    } catch (verifyError) {
      console.warn('Error verifying token permissions:', verifyError);
      // We'll continue and store the token anyway
    }

    // Store token in database
    const { error: insertError } = await supabase
      .from('facebook_tokens')
      .insert({
        user_id: user.id,
        access_token: tokenData.access_token,
        expires_at: expiresAt.toISOString(),
        has_ad_permissions: hasRequiredPermissions
      });

    if (insertError) {
      console.error('Error storing Facebook token:', insertError);
      errorUrl.searchParams.set('error', 'token_storage_failed');
      return NextResponse.redirect(errorUrl);
    }

    // Log successful token storage
    console.log('Facebook token stored successfully for user:', user.id);
    console.log('Token expires at:', expiresAt.toISOString());
    console.log('Has required ad permissions:', hasRequiredPermissions);

    // If token was stored but doesn't have permissions, show warning
    if (!hasRequiredPermissions) {
      redirectUrl.searchParams.set('warning', 'limited_permissions');
      redirectUrl.searchParams.set('warning_description', 'Limited ad access permissions detected. Some features may not work.');
    }

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error('Unexpected error in Facebook callback:', error);
    const errorUrl = new URL('/', request.url);
    errorUrl.searchParams.set('error', 'unexpected_error');
    return NextResponse.redirect(errorUrl);
  }
} 