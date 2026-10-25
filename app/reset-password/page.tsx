import { AuthForm } from '@/app/auth/form'
export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ update?: string }> }) {
  const params = await searchParams
  return <AuthForm mode={params.update === '1' ? 'update' : 'reset'} />
}
