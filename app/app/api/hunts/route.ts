import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: hunts, error } = await supabase
    .from('hunts')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ hunts })
}

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { name, description, num_queries, results_per_query, max_results } = body

    // Validate input
    if (!name || !description) {
      return NextResponse.json(
        { error: 'Name and description are required' },
        { status: 400 }
      )
    }

    // Create hunt
    const { data: hunt, error: huntError } = await supabase
      .from('hunts')
      .insert({
        user_id: user.id,
        name,
        description,
        status: 'draft',
        num_queries: num_queries || 10,
        results_per_query: results_per_query || 50,
        max_results: max_results || 500,
      })
      .select()
      .single()

    if (huntError) {
      return NextResponse.json({ error: huntError.message }, { status: 500 })
    }

    // Generate queries using LLM (async, we'll trigger this in background)
    // For now, just return the hunt - we'll add query generation next
    return NextResponse.json({ hunt })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
