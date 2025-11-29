import { inngest } from './client'
import { createClient as createBrowserClient } from '@supabase/supabase-js'

// Create a Supabase client for background jobs (uses service role key)
function createServiceClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

interface SerperOrganicResult {
  link: string
  title: string
  snippet: string
  position: number
}

interface SerperResponse {
  organic: SerperOrganicResult[]
}

export const executeQuery = inngest.createFunction(
  {
    id: 'execute-query',
    name: 'Execute LinkedIn Search Query',
    retries: 3,
  },
  { event: 'query/approved' },
  async ({ event, step }) => {
    const { queryId } = event.data

    // Step 1: Fetch query data
    const query = await step.run('fetch-query', async () => {
      const supabase = createServiceClient()
      const { data, error } = await supabase
        .from('queries')
        .select('*, hunts!inner(*)')
        .eq('id', queryId)
        .single()

      if (error) {
        console.error('Supabase error fetching query:', error)
        throw new Error(`Query fetch error: ${error.message}`)
      }

      if (!data) {
        console.error('No query found for ID:', queryId)
        throw new Error('Query not found')
      }

      return data
    })

    // Step 2: Execute Serper.dev search with pagination
    const profiles = await step.run('search-profiles', async () => {
      const resultsPerQuery = query.hunts.results_per_query || 500
      const profiles: any[] = []
      const pagesNeeded = Math.ceil(resultsPerQuery / 100) // Serper returns up to 100 results per request
      const maxPages = Math.min(pagesNeeded, 10) // Limit to 10 pages (1000 results max)

      console.log(`Executing query ${queryId}: ${query.xray_query}`)
      console.log(`Fetching up to ${maxPages} pages (targeting ${resultsPerQuery} results)`)

      for (let page = 0; page < maxPages; page++) {
        try {
          // Make POST request to Serper.dev API
          const response = await fetch('https://google.serper.dev/search', {
            method: 'POST',
            headers: {
              'X-API-KEY': process.env.SERPER_API_KEY!,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              q: query.xray_query,
              num: 100, // Request 100 results per page
              page: page + 1, // Serper uses 1-based page numbers
            }),
          })

          if (!response.ok) {
            throw new Error(`Serper API error: ${response.status} ${response.statusText}`)
          }

          const data: SerperResponse = await response.json()
          const results = data.organic || []

          console.log(`  Page ${page + 1}: found ${results.length} results`)

          // Stop if no results returned (end of available results)
          if (results.length === 0) {
            console.log('  No more results available')
            break
          }

          for (const result of results) {
            const url = result.link

            if (url.includes('linkedin.com/in/')) {
              profiles.push({
                hunt_id: query.hunt_id,
                query_id: queryId,
                linkedin_url: url,
                name: result.title || null,
                headline: result.snippet || null,
                rank: profiles.length + 1, // Preserves search result order
                source_query: query.xray_query,
                status: 'new',
              })
            }
          }

          // Stop if we've reached the target
          if (profiles.length >= resultsPerQuery) {
            console.log(`  Reached target of ${resultsPerQuery} profiles`)
            break
          }

          // Rate limiting to avoid overwhelming Serper.dev
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (pageError: any) {
          console.error(`Error fetching page ${page + 1}:`, pageError.message)
          // Continue to next page on error
        }
      }

      console.log(`Total profiles found: ${profiles.length}`)
      return profiles
    })

    // Step 3: Save profiles to database
    await step.run('save-profiles', async () => {
      if (profiles.length > 0) {
        // Deduplicate profiles by LinkedIn URL (keep first occurrence)
        const uniqueProfiles = profiles.reduce((acc: any[], profile: any) => {
          const exists = acc.find(p => p.linkedin_url === profile.linkedin_url)
          if (!exists) {
            acc.push(profile)
          }
          return acc
        }, [])

        console.log(`Deduplicating: ${profiles.length} profiles → ${uniqueProfiles.length} unique`)

        const supabase = createServiceClient()
        const { data, error } = await supabase
          .from('profiles')
          .upsert(uniqueProfiles, {
            onConflict: 'hunt_id,linkedin_url',
            ignoreDuplicates: false
          })
          .select()

        if (error) {
          console.error('Error saving profiles:', error.message)
          throw new Error(`Failed to save profiles: ${error.message}`)
        }

        console.log(`Successfully saved/updated ${data?.length || 0} profiles`)
      }
    })

    // Step 4: Update query status
    await step.run('update-query-status', async () => {
      const supabase = createServiceClient()
      await supabase
        .from('queries')
        .update({
          status: 'completed',
          results_count: profiles.length,
          executed_at: new Date().toISOString(),
        })
        .eq('id', queryId)
    })

    return {
      success: true,
      profiles_found: profiles.length,
    }
  }
)

// Export all functions
export const functions = [executeQuery]
