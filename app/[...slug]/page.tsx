import { notFound } from 'next/navigation'
import { Lesson } from '@/components/adapt-app'

export default async function RoutePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  if (slug.length !== 1 || !['lesson', 'results'].includes(slug[0])) notFound()
  return <Lesson />
}
