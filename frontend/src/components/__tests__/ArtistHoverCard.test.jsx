import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ArtistHoverCard from '../ArtistHoverCard';

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('../../contexts/SocketContext', () => ({
  useSocket: () => ({ socket: null }),
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'current-user' } }),
}));

vi.mock('../../hooks/useFocusTrap', () => ({
  useFocusTrap: () => ({ current: null }),
}));

const mockData = {
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
    { _id: '2', title: 'Art 2', thumbnail: 'thumb2.jpg' },
  ],
  followedAt: '2025-01-01T00:00:00Z',
  badges: {
    recentlyActive: true,
    recentlyPosted: false,
  },
};

const defaultProps = {
  data: mockData,
  isLoading: false,
  error: null,
  errorCode: null,
  artistId: '123',
  position: { x: 100, y: 100 },
  onClose: vi.fn(),
  onMessage: vi.fn(),
  onUnfollow: vi.fn(),
  onRetry: vi.fn(),
};

const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('ArtistHoverCard', () => {
  it('should render loading skeleton when loading', () => {
    renderWithRouter(
      <ArtistHoverCard {...defaultProps} isLoading={true} data={null} />
    );

    expect(screen.getByRole('dialog', { name: /loading artist preview/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/loading artist preview/i)).toHaveAttribute('aria-busy', 'true');
  });

  it('should render artist data correctly', () => {
    renderWithRouter(<ArtistHoverCard {...defaultProps} />);

    expect(screen.getByText('TestArtist')).toBeInTheDocument();
    expect(screen.getByText('Test bio')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /TestArtist's avatar/i })).toBeInTheDocument();
  });

  it('should display "No bio available" when bio is missing', () => {
    const dataWithoutBio = {
      ...mockData,
      user: { ...mockData.user, profile: { avatar: 'test.jpg' } },
    };

    renderWithRouter(<ArtistHoverCard {...defaultProps} data={dataWithoutBio} />);

    expect(screen.getByText('No bio available')).toBeInTheDocument();
  });

  it('should render artworks in gallery', () => {
    renderWithRouter(<ArtistHoverCard {...defaultProps} />);

    expect(screen.getByRole('img', { name: /Artwork 1: Art 1/i })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Artwork 2: Art 2/i })).toBeInTheDocument();
  });

  it('should display "No artworks yet" when artworks array is empty', () => {
    const dataWithoutArtworks = {
      ...mockData,
      artworks: [],
    };

    renderWithRouter(<ArtistHoverCard {...defaultProps} data={dataWithoutArtworks} />);

    expect(screen.getByText('No artworks yet')).toBeInTheDocument();
  });

  it('should render error state with retry button', () => {
    renderWithRouter(
      <ArtistHoverCard
        {...defaultProps}
        data={null}
        error={new Error('Test error')}
        errorCode="NETWORK_ERROR"
      />
    );

    expect(screen.getByText('Unable to load preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry loading artist preview/i })).toBeInTheDocument();
  });

  it('should render artist unavailable error without retry', () => {
    renderWithRouter(
      <ArtistHoverCard
        {...defaultProps}
        data={null}
        error={new Error('Not found')}
        errorCode="ARTIST_NOT_FOUND"
      />
    );

    expect(screen.getByText('Artist unavailable')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove from following list/i })).toBeInTheDocument();
  });

  it('should display online indicator when artist is online', () => {
    renderWithRouter(<ArtistHoverCard {...defaultProps} />);

    const onlineIndicator = screen.getByRole('status', { name: /user is online/i });
    expect(onlineIndicator).toBeInTheDocument();
  });

  it('should display activity badges', () => {
    renderWithRouter(<ArtistHoverCard {...defaultProps} />);

    expect(screen.getByText('Recently Active')).toBeInTheDocument();
  });

  it('should disable message button for current user', () => {
    const dataWithCurrentUser = {
      ...mockData,
      user: { ...mockData.user, _id: 'current-user' },
    };

    renderWithRouter(<ArtistHoverCard {...defaultProps} data={dataWithCurrentUser} />);

    const messageButton = screen.getByRole('button', { name: /send a message/i });
    expect(messageButton).toBeDisabled();
  });
});
