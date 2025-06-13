import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { FacebookService } from '@/lib/services/facebook-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const adAccountId = formData.get('adAccountId') as string;
    const mediaType = formData.get('mediaType') as string;

    console.log('Media upload request:', { 
      fileName: file?.name, 
      fileSize: file?.size, 
      adAccountId, 
      mediaType 
    });

    if (!file || !adAccountId || !mediaType) {
      return NextResponse.json(
        { error: 'File, ad account ID, and media type are required' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi'];
    
    if (mediaType === 'image' && !allowedImageTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid image file type. Supported formats: JPG, PNG, GIF' },
        { status: 400 }
      );
    }

    if (mediaType === 'video' && !allowedVideoTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid video file type. Supported formats: MP4, MOV, AVI' },
        { status: 400 }
      );
    }

    // Validate file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 50MB' },
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

    // Verify user owns this ad account
    const { data: adAccount, error: adAccountError } = await supabase
      .from('facebook_ad_accounts')
      .select('id')
      .eq('id', adAccountId)
      .eq('user_id', user.id)
      .single();

    if (adAccountError || !adAccount) {
      return NextResponse.json(
        { error: 'Ad account not found or access denied' },
        { status: 403 }
      );
    }

    // Get Facebook access token
    const facebookService = new FacebookService(supabase);
    const accessToken = await facebookService.getAccessToken(user.id);
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Facebook account not connected' },
        { status: 401 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Prepare form data for Facebook API
    const facebookFormData = new FormData();
    facebookFormData.append('filename', file.name);
    facebookFormData.append('access_token', accessToken);

    // Create blob from buffer for Facebook API
    const blob = new Blob([buffer], { type: file.type });
    facebookFormData.append('source', blob, file.name);

    // Determine Facebook API endpoint
    const endpoint = mediaType === 'image' ? 'adimages' : 'advideos';
    const apiUrl = `https://graph.facebook.com/v23.0/${adAccountId}/${endpoint}`;

    console.log('Uploading to Facebook API:', { endpoint, fileName: file.name });

    // Upload to Facebook
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: facebookFormData,
    });

    if (!response.ok) {
      let errorData: Record<string, unknown> = {};
      try {
        errorData = await response.json();
      } catch {
        // Ignore JSON parsing errors
      }

      const errorMessage = errorData.error?.message || response.statusText;
      console.error('Facebook API error uploading media:', errorData);

      // Handle specific Facebook API error codes
      let statusCode = 400;
      if (errorData.error?.code === 200 || errorMessage.toLowerCase().includes('permission')) {
        statusCode = 403;
      } else if (errorMessage.toLowerCase().includes('not found')) {
        statusCode = 404;
      } else if (errorMessage.toLowerCase().includes('rate limit')) {
        statusCode = 429;
      }

      return NextResponse.json(
        { error: `Failed to upload media: ${errorMessage}` },
        { status: statusCode }
      );
    }

    const uploadResult = await response.json();
    console.log('Media uploaded successfully:', uploadResult);

    // Extract media ID from response
    let mediaId: string;
    if (mediaType === 'image') {
      // For images, the response contains image hashes
      mediaId = uploadResult.images?.[file.name]?.hash || uploadResult.hash;
    } else {
      // For videos, the response contains video ID
      mediaId = uploadResult.id;
    }

    if (!mediaId) {
      console.error('No media ID returned from Facebook API:', uploadResult);
      return NextResponse.json(
        { error: 'Failed to get media ID from Facebook' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mediaId,
      mediaType,
      fileName: file.name,
      fileSize: file.size,
      uploadResult
    });

  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}