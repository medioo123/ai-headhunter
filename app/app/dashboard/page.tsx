import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user's hunts
  const { data: hunts, error } = await supabase
    .from('hunts')
    .select('*')
    .order('created_at', { ascending: false })

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Headhunter</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user.email}</span>
            <form action={handleSignOut}>
              <Button variant="outline" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold">Your Hunts</h2>
            <p className="text-muted-foreground mt-1">
              Manage your LinkedIn search campaigns
            </p>
          </div>
          <Link href="/dashboard/hunts/new">
            <Button size="lg">Create New Hunt</Button>
          </Link>
        </div>

        {error && (
          <div className="text-red-600 mb-4">
            Error loading hunts: {error.message}
          </div>
        )}

        {hunts && hunts.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <h3 className="text-xl font-semibold mb-2">No hunts yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first hunt to start finding LinkedIn profiles
              </p>
              <Link href="/dashboard/hunts/new">
                <Button>Create Your First Hunt</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hunts?.map((hunt) => (
            <Link key={hunt.id} href={`/dashboard/hunts/${hunt.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{hunt.name}</CardTitle>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
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
                  <CardDescription className="line-clamp-2">
                    {hunt.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <div>Queries: {hunt.num_queries}</div>
                    <div>Max Results: {hunt.max_results}</div>
                    <div className="mt-2">
                      Created {new Date(hunt.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
