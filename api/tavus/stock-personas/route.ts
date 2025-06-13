import { NextResponse } from 'next/server';
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
    const personas = tavusService.getStockPersonas();

    return NextResponse.json({ personas });
  } catch (error) {
    console.error('Error fetching stock personas:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock personas' },
      { status: 500 }
    );
  }
} 