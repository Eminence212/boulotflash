'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { AdminLoginForm } from '@/components/auth/AdminLoginForm';
import { apiFetch } from '@/lib/api';
import { saveAdminAccessToken } from '@/lib/admin-api';

export default function AdminConnexionPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCredentials(username: string, password: string) {
    setError(null);
    setLoading(true);
    try {
      const { status, data } = await apiFetch<{ totpRequired?: boolean }>(
        '/admin/auth/login',
        { method: 'POST', body: { username, password } },
      );
      if (status >= 400 || !data.totpRequired) {
        setError(data.message ?? 'Identifiants invalides.');
        throw new Error('login-failed');
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'login-failed') throw err;
      setError('Impossible de joindre le serveur.');
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function onTotp(code: string) {
    setError(null);
    setLoading(true);
    try {
      const { status, data } = await apiFetch<{
        accessToken?: string;
        message?: string;
      }>('/admin/auth/totp', { method: 'POST', body: { code } });
      if (status >= 400 || !data.accessToken) {
        setError(data.message ?? 'Code invalide.');
        return;
      }
      saveAdminAccessToken(data.accessToken);
      router.replace('/admin');
    } catch {
      setError('Impossible de valider le code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <AdminLoginForm
        onCredentials={onCredentials}
        onTotp={onTotp}
        error={error}
        loading={loading}
      />
    </AuthPageShell>
  );
}
