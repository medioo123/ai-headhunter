'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export default function NewHuntPage() {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Create hunt with fixed defaults
      const response = await fetch('/api/hunts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          num_queries: 10, // Fixed: always generate 10 queries
          results_per_query: 500, // Fixed: 500 results per query when executed
          max_results: null, // No limit on total results
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create hunt')
      }

      const { hunt } = await response.json()

      // Generate queries using LLM
      const generateResponse = await fetch(`/api/hunts/${hunt.id}/generate-queries`, {
        method: 'POST',
      })

      if (!generateResponse.ok) {
        throw new Error('Failed to generate queries')
      }

      router.push(`/dashboard/hunts/${hunt.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <header className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Create New Hunt</CardTitle>
            <CardDescription>
              Describe who you're looking for and we'll generate 10 optimized LinkedIn search queries for you to review and approve
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Hunt Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Chargés d'affaires Île-de-France"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Who are you looking for?</Label>
                <textarea
                  id="description"
                  className="flex min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Describe the profiles you're looking for...&#10;&#10;Example: Je cherche des conseillers clientèle professionnels, chargés d'affaires pro dans les Yvelines ou Île-de-France. Ayant travaillé chez LCL, BNP Paribas, Société Générale. Avec expérience PME/TPE, au moins 5 ans."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  💡 Include: job titles, locations (cities, departments, postal codes), companies (current/previous), skills, and experience requirements
                </p>
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? 'Creating Hunt...' : 'Create Hunt & Generate Queries'}
                </Button>
                <Link href="/dashboard">
                  <Button type="button" variant="outline" disabled={loading}>
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
