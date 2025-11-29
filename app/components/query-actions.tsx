'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle } from 'lucide-react'

interface QueryActionsProps {
  queryId: string
}

export function QueryActions({ queryId }: QueryActionsProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleApprove = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/queries/${queryId}/approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to approve query')
      }

      router.refresh()
    } catch (error) {
      console.error('Error approving query:', error)
      alert('Failed to approve query')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('Are you sure you want to reject this query? It will be deleted.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/queries/${queryId}/reject`, {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to reject query')
      }

      router.refresh()
    } catch (error) {
      console.error('Error rejecting query:', error)
      alert('Failed to reject query')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleApprove}
        disabled={loading}
        size="sm"
        className="bg-green-600 hover:bg-green-700"
      >
        <CheckCircle2 className="w-4 h-4 mr-1" />
        {loading ? 'Approving...' : 'Approve & Run'}
      </Button>
      <Button
        onClick={handleReject}
        disabled={loading}
        size="sm"
        variant="outline"
        className="border-red-300 text-red-600 hover:bg-red-50"
      >
        <XCircle className="w-4 h-4 mr-1" />
        Reject
      </Button>
    </div>
  )
}
