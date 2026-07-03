import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { filename, contentType } = await request.json();
    if (!filename) return NextResponse.json({ error: 'filename is required' }, { status: 400 });

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('history-images')
      .createSignedUploadUrl(path);

    if (error) throw error;

    return NextResponse.json({ path, token: data.token, signedUrl: data.signedUrl, contentType });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create upload URL' }, { status: 500 });
  }
}
