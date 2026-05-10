'use server'

import { redirect } from 'next/navigation'

import { clearAdminSessao } from '@/lib/admin-auth'

export async function sair(): Promise<void> {
  await clearAdminSessao()
  redirect('/admin/login')
}
