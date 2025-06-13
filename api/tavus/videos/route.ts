import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TavusService } from '@/lib/services/tavus-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tavusService = new TavusService(supabase);
    const videos = await tavusService.listVideos(user.id);

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { replica_id, script, video_name, background_url } = body;

    if (!script || !video_name) {
      return NextResponse.json(
        { error: 'Missing required fields: script, video_name' },
        { status: 400 }
      );
    }

    const tavusService = new TavusService(supabase);
    const video = await tavusService.createVideo({
      replica_id,
      script,
      video_name,
      background_url,
    }, user.id);

    return NextResponse.json({ video });
  } catch (error) {
    console.error('Error creating video:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create video' },
      { status: 500 }
    );
  }
} 