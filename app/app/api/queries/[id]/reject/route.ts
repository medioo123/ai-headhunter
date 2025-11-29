import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get query
    const { data: query, error: queryError } = await supabase
      .from('queries')
      .select('*, hunts!inner(*)')
      .eq('id', id)
      .single()

    if (queryError || !query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 })
    }

    // Verify ownership
    if (query.hunts.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete the query
    const { error: deleteError } = await supabase
      .from('queries')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw deleteError
    }

    // Revalidate the hunt page
    revalidatePath(`/dashboard/hunts/${query.hunt_id}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Reject query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
