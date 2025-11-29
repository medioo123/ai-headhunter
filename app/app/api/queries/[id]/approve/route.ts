import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { inngest } from '@/lib/inngest/client'

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

    // Update status to running
    const { error: updateError } = await supabase
      .from('queries')
      .update({
        status: 'running',
        executed_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      throw updateError
    }

    // Trigger Inngest background job
    await inngest.send({
      name: 'query/approved',
      data: {
        queryId: id,
      },
    })

    // Revalidate the hunt page
    revalidatePath(`/dashboard/hunts/${query.hunt_id}`)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Approve query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
