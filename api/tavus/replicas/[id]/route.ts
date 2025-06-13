import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { TavusService } from '@/lib/services/tavus-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tavusService = new TavusService(supabase);
    const replica = await tavusService.getReplica(params.id, user.id);

    if (!replica) {
      return NextResponse.json({ error: 'Replica not found' }, { status: 404 });
    }

    return NextResponse.json({ replica });
  } catch (error) {
    console.error('Error fetching replica:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replica' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (!user || userError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tavusService = new TavusService(supabase);
    await tavusService.deleteReplica(params.id, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting replica:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete replica' },
      { status: 500 }
    );
  }
} 