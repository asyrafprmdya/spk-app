import { NextResponse } from 'next/server';
import { InputError, recommend } from '@/lib/recommend';

export async function POST(req: Request) {
  try {
    const result = recommend(await req.json());
    return NextResponse.json({ ...result, ranking: result.ranking.slice(0, 20) });
  } catch (e) {
    if (e instanceof InputError) return NextResponse.json({ errors: e.errors }, { status: 400 });
    return NextResponse.json({ errors: ['Terjadi kesalahan server'] }, { status: 500 });
  }
}