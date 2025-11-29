import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { CheckCircle2, XCircle, Clock, Play } from 'lucide-react'
import { QueryActions } from '@/components/query-actions'
import { GenerateMoreQueries } from '@/components/generate-more-queries'
import { AutoRefresh } from '@/components/auto-refresh'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function HuntDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch hunt
  const { data: hunt, error: huntError } = await supabase
    .from('hunts')
    .select('*')
    .eq('id', id)
    .single()

  if (huntError || !hunt) {
    redirect('/dashboard')
  }

  // Fetch queries
  const { data: queries } = await supabase
    .from('queries')
    .select('*')
    .eq('hunt_id', id)
    .order('priority', { ascending: true })

  // Fetch profiles count
  const { count: profilesCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('hunt_id', id)

  const pendingQueries = queries?.filter(q => q.status === 'pending') || []
  const runningQueries = queries?.filter(q => q.status === 'running') || []
  const completedQueries = queries?.filter(q => q.status === 'completed') || []
  const failedQueries = queries?.filter(q => q.status === 'failed') || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Auto-refresh when there are running queries */}
      {runningQueries.length > 0 && <AutoRefresh interval={3000} />}

      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Hunt Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{hunt.name}</h1>
              <p className="text-muted-foreground">{hunt.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <GenerateMoreQueries huntId={id} />
              <span
                className={`px-3 py-1 text-sm rounded-full ${
                  hunt.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : hunt.status === 'paused'
                    ? 'bg-yellow-100 text-yellow-800'
                    : hunt.status === 'completed'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {hunt.status}
              </span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{queries?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total Queries</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{completedQueries.length}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">{pendingQueries.length}</div>
                <p className="text-xs text-muted-foreground">Pending Approval</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">{profilesCount || 0}</div>
                <p className="text-xs text-muted-foreground">Profiles Found</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Queries List */}
        <div className="space-y-8">
          {/* Pending Approval Section */}
          {pendingQueries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-6 h-6 text-yellow-600" />
                Pending Approval ({pendingQueries.length})
              </h2>
              <div className="space-y-3">
                {pendingQueries.map((query) => (
                  <QueryCard key={query.id} query={query} huntId={id} />
                ))}
              </div>
            </div>
          )}

          {/* Running Queries Section */}
          {runningQueries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Play className="w-6 h-6 text-blue-600" />
                Running ({runningQueries.length})
              </h2>
              <div className="space-y-3">
                {runningQueries.map((query) => (
                  <QueryCard key={query.id} query={query} huntId={id} />
                ))}
              </div>
            </div>
          )}

          {/* Completed Section */}
          {completedQueries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                Completed ({completedQueries.length})
              </h2>
              <div className="space-y-3">
                {completedQueries.map((query) => (
                  <QueryCard key={query.id} query={query} huntId={id} />
                ))}
              </div>
            </div>
          )}

          {/* Failed Section */}
          {failedQueries.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <XCircle className="w-6 h-6 text-red-600" />
                Failed ({failedQueries.length})
              </h2>
              <div className="space-y-3">
                {failedQueries.map((query) => (
                  <QueryCard key={query.id} query={query} huntId={id} />
                ))}
              </div>
            </div>
          )}

          {/* No Queries */}
          {!queries || queries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No queries generated yet
              </CardContent>
            </Card>
          ) : null}
        </div>
      </main>
    </div>
  )
}

function QueryCard({ query, huntId }: { query: any; huntId: string }) {
  const statusConfig = {
    pending: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: <Clock className="w-5 h-5 text-yellow-600" />,
      text: 'Pending Approval',
      color: 'text-yellow-800'
    },
    running: {
      bg: 'bg-blue-50 border-blue-200',
      icon: <Play className="w-5 h-5 text-blue-600" />,
      text: 'Running',
      color: 'text-blue-800'
    },
    completed: {
      bg: 'bg-green-50 border-green-200',
      icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
      text: 'Completed',
      color: 'text-green-800'
    },
    failed: {
      bg: 'bg-red-50 border-red-200',
      icon: <XCircle className="w-5 h-5 text-red-600" />,
      text: 'Failed',
      color: 'text-red-800'
    }
  }

  const config = statusConfig[query.status as keyof typeof statusConfig]
  const isClickable = query.status === 'completed' && query.results_count > 0

  const cardContent = (
    <Card className={`${config.bg} border-2 transition-all ${isClickable ? 'hover:shadow-lg cursor-pointer' : 'hover:shadow-md'}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-1 bg-white rounded text-xs font-medium">
                Priority {query.priority}
              </span>
              <div className="flex items-center gap-1">
                {config.icon}
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.text}
                </span>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div><strong>Job:</strong> {query.job_title}</div>
              <div><strong>Company:</strong> {query.company}</div>
              <div><strong>Location:</strong> {query.location}</div>
            </div>
            <div className="mt-3 p-3 bg-white rounded font-mono text-xs overflow-x-auto max-h-32 overflow-y-auto border border-slate-200">
              <div className="whitespace-pre-wrap break-words">
                {query.xray_query}
              </div>
            </div>
            {query.results_count > 0 && (
              <div className="mt-2 text-sm font-medium text-green-600 flex items-center gap-1">
                ✓ Found {query.results_count} profiles
                {query.status === 'completed' && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Click to view)
                  </span>
                )}
              </div>
            )}
            {query.error && (
              <div className="mt-2 text-sm text-red-600">
                Error: {query.error}
              </div>
            )}
          </div>

          {query.status === 'pending' && (
            <div className="ml-4">
              <QueryActions queryId={query.id} />
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  )

  if (isClickable) {
    return (
      <Link href={`/dashboard/queries/${query.id}/profiles`}>
        {cardContent}
      </Link>
    )
  }

  return cardContent
}
