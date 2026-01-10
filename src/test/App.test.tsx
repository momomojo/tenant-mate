import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// Mock the Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}));

describe('App', () => {
  it('renders without crashing', () => {
    // App includes its own BrowserRouter and QueryClientProvider,
    // so we render it directly without test-utils wrapper
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Wrap only with QueryClientProvider since App has its own
    // Actually App has everything, render directly
    render(<App />);

    // App should render - the landing page or auth redirect
    expect(document.body).toBeDefined();
  });
});
