import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { getJson } from 'serpapi'

interface LinkedInResult {
  link?: string
  title?: string
  snippet?: string
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const supabase = await createClient()

  try {
    // Get query with hunt data
    const { data: query, error: queryError } = await supabase
      .from('queries')
      .select('*, hunts!inner(*)')
      .eq('id', id)
      .single()

    if (queryError || !query) {
      return NextResponse.json({ error: 'Query not found' }, { status: 404 })
    }

    const resultsPerQuery = query.hunts.results_per_query || 500
    const profiles: any[] = []

    // SerpAPI pagination: fetch multiple pages
    const pagesNeeded = Math.ceil(resultsPerQuery / 10) // 10 results per page
    const maxPages = Math.min(pagesNeeded, 10) // Limit to 10 pages (100 results max per query)

    console.log(`Executing query ${id}: ${query.xray_query}`)
    console.log(`Fetching ${maxPages} pages (targeting ${resultsPerQuery} results)`)

    for (let page = 0; page < maxPages; page++) {
      try {
        const params = {
          engine: 'google',
          q: query.xray_query,
          api_key: process.env.SERPAPI_KEY,
          num: 10,
          start: page * 10,
        }

        const response = await getJson(params)
        const results: LinkedInResult[] = response.organic_results || []

        console.log(`  Page ${page + 1}: found ${results.length} results`)

        for (const result of results) {
          const url = result.link || ''

          // Only LinkedIn profile URLs
          if (url.includes('linkedin.com/in/')) {
            profiles.push({
              hunt_id: query.hunt_id,
              query_id: id,
              linkedin_url: url,
              name: result.title || null,
              headline: result.snippet || null,
              rank: profiles.length + 1,
              source_query: query.xray_query,
              status: 'new',
            })
          }
        }

        // Stop if we have enough results
        if (profiles.length >= resultsPerQuery) {
          break
        }

        // Rate limiting: small delay between requests
        if (page < maxPages - 1) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      } catch (pageError: any) {
        console.error(`Error fetching page ${page + 1}:`, pageError.message)
        // Continue to next page even if one fails
      }
    }

    console.log(`Total profiles found: ${profiles.length}`)

    // Insert profiles (ignoring duplicates due to UNIQUE constraint)
    if (profiles.length > 0) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert(profiles)
        .select()

      if (insertError) {
        // Log but don't fail - duplicates are expected
        console.log('Some profiles may already exist:', insertError.message)
      }
    }

    // Update query status
    await supabase
      .from('queries')
      .update({
        status: 'completed',
        results_count: profiles.length,
        executed_at: new Date().toISOString(),
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      profiles_found: profiles.length,
    })
  } catch (error: any) {
    console.error('Execute query error:', error)

    // Update query to failed status
    await supabase
      .from('queries')
      .update({
        status: 'failed',
        error: error.message,
      })
      .eq('id', id)

    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
