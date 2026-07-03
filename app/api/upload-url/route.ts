import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST(req: Request) {
  try {
    const { filename, contentType } = await req.json();
    if (!filename) return NextResponse.json({ error: 'filename is required' }, { status: 400 });
    const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `history/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
    const { data, error } = await supabaseAdmin.storage.from('history-images').createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path, signedUrl: data.signedUrl, token: data.token, contentType });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
