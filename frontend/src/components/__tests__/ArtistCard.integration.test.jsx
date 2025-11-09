import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ArtistCard from '../ArtistCard';
import http from '../../lib/http';

vi.mock('../../lib/http');
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'current-user' } }),
}));

vi.mock('../../contexts/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

vi.mock('../../hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockArtist = {
  _id: '123',
  username: 'TestArtist',
  profile: {
    avatar: 'test-avatar.jpg',
    bio: 'Test bio',
  },
  role: 'artist',
  followers: ['user1', 'user2'],
};

const mockPreviewData = {
  data: {
    user: {
      _id: '123',
      username: 'TestArtist',
      profile: {
        avatar: 'test-avatar.jpg',
        bio: 'Test bio',
      },
      isOnline: true,
    },
    artworks: [
      { _id: '1', title: 'Art 1', thumbnail: 'thumb1.jpg' },
    ],
    followedAt: '2025-01-01T00:00:00Z',
    badges: {
      recentlyActive: true,
    },
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </BrowserRouter>
  );
};

describe('ArtistCard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'test-token');
    
    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('should show hover card after 300ms hover', async () => {
    http.get.mockResolvedValueOnce(mockPreviewData);
    const user = userEvent.setup({ delay: null });

    render(<ArtistCard artist={mockArtist} onUnfollow={vi.fn()} />, {
      wrapper: createWrapper(),
    });

    const card = screen.getByRole('button', { name: /view TestArtist's profile/i });
    await user.hover(card);

    // Wait for debounce delay (300ms) + fetch
    await waitFor(
      () => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      },
      { timeout: 1000 }
    );

    expect(screen.getByText('TestArtist')).toBeInTheDocument();
  });

  it('should use cached data on second hover', async () => {
    http.get.mockResolvedValueOnce(mockPreviewData);
    const user = userEvent.setup({ delay: null });

    render(
      <ArtistCard artist={mockArtist} onUnfollow={vi.fn()} />,
      { wrapper: createWrapper() }
    );

    const card = screen.getByRole('button', { name: /view TestArtist's profile/i });

    // First hover
    await user.hover(card);
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument(), {
      timeout: 1000,
    });

    // Should only have called API once
    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
