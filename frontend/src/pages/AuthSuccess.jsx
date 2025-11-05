import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      navigate('/auth', { replace: true });
      return;
    }

    (async () => {
      try {
        // store token
        localStorage.setItem('auth_token', token);

        // decode token payload to get user id (server signs { id })
        let user = null;
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userId = payload?.id;
          if (userId) {
            const res = await axios.get(`${API_URL}/api/users/${userId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            user = res.data?.data ?? res.data ?? null;
          }
        } catch (e) {
          console.warn('Could not fetch user from token:', e);
        }

        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }

        // notify app
        window.dispatchEvent(new CustomEvent('auth:success', { detail: { user } }));

        // redirect home
        navigate('/', { replace: true });
      } catch (err) {
        console.error('Auth success handling failed', err);
        navigate('/auth', { replace: true });
      }
    })();
  }, [navigate]);

  return <div style={{ padding: 24 }}>Signing you in…</div>;
}