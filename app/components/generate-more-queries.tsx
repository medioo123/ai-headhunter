'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

interface GenerateMoreQueriesProps {
  huntId: string
}

export function GenerateMoreQueries({ huntId }: GenerateMoreQueriesProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/hunts/${huntId}/generate-queries`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to generate queries')
      }

      router.refresh()
    } catch (error) {
      console.error('Error generating queries:', error)
      alert('Failed to generate queries')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGenerate}
      disabled={loading}
      variant="outline"
      className="border-purple-300 text-purple-600 hover:bg-purple-50"
    >
      <Sparkles className="w-4 h-4 mr-2" />
      {loading ? 'Generating...' : 'Generate More Queries'}
    </Button>
  )
}
