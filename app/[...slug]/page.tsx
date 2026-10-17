import { notFound } from 'next/navigation'
import { Lesson } from '@/components/adapt-app'
import { MaterialWorkspace } from '@/components/material-workspace'

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  if (slug.length !== 1 || !['lesson', 'results', 'workspace'].includes(slug[0])) notFound()
  if (slug[0] === 'workspace') return <MaterialWorkspace />
  return <Lesson />
}
