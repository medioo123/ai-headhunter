import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { ExternalLink, ArrowLeft } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QueryProfilesPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch query with hunt data
  const { data: query, error: queryError } = await supabase
    .from('queries')
    .select('*, hunts!inner(*)')
    .eq('id', id)
    .single()

  if (queryError || !query) {
    redirect('/dashboard')
  }

  // Verify ownership
  if (query.hunts.user_id !== user.id) {
    redirect('/dashboard')
  }

  // Fetch profiles for this query
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('query_id', id)
    .order('rank', { ascending: true })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link
            href={`/dashboard/hunts/${query.hunt_id}`}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Hunt
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Query Info */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Profiles Found</h1>
          <div className="text-muted-foreground space-y-1">
            <div><strong>Job:</strong> {query.job_title}</div>
            <div><strong>Company:</strong> {query.company}</div>
            <div><strong>Location:</strong> {query.location}</div>
            <div className="mt-3 p-2 bg-white rounded font-mono text-xs">
              {query.xray_query}
            </div>
          </div>
        </div>

        {/* Profiles Count */}
        <div className="mb-4">
          <h2 className="text-xl font-bold">
            {profiles?.length || 0} Profiles
          </h2>
        </div>

        {/* Profiles List */}
        {!profiles || profiles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No profiles found
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <Card key={profile.id} className="hover:shadow-md transition-all">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-medium">
                          #{profile.rank}
                        </span>
                        {profile.name && (
                          <h3 className="font-semibold text-lg">{profile.name}</h3>
                        )}
                      </div>
                      {profile.headline && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {profile.headline}
                        </p>
                      )}
                      <a
                        href={profile.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink className="w-4 h-4" />
                        View LinkedIn Profile
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
