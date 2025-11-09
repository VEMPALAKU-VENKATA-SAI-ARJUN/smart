import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useArtistPreview } from '../useArtistPreview';
import http from '../../lib/http';

vi.mock('../../lib/http');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useArtistPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('auth_token', 'test-token');
  });

  it('should fetch artist preview data successfully', async () => {
    const mockData = {
      data: {
        user: { _id: '123', username: 'TestArtist', profile: { avatar: 'test.jpg' } },
        artworks: [],
      },
    };
    http.get.mockResolvedValueOnce(mockData);

    const { result } = renderHook(() => useArtistPreview('123'), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData.data);
    expect(result.current.error).toBe(null);
  });



  it('should use cached data within 30 seconds', async () => {
    const mockData = {
      data: {
        user: { _id: '123', username: 'TestArtist' },
        artworks: [],
      },
    };
    http.get.mockResolvedValueOnce(mockData);

    const wrapper = createWrapper();
    
    // First render
    const { result: result1 } = renderHook(() => useArtistPreview('123'), { wrapper });
    await waitFor(() => expect(result1.current.isLoading).toBe(false));

    // Second render should use cache
    const { result: result2 } = renderHook(() => useArtistPreview('123'), { wrapper });
    
    expect(result2.current.isLoading).toBe(false);
    expect(result2.current.data).toEqual(mockData.data);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('should not retry on 404 errors', async () => {
    const error = new Error('Not Found');
    error.response = { status: 404, data: { code: 'ARTIST_NOT_FOUND' } };
    http.get.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useArtistPreview('123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(http.get).toHaveBeenCalledTimes(1);
  });
});
