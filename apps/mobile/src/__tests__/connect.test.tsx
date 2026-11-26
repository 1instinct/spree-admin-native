import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ConnectScreen from '@/app/(auth)/connect';
import { AppThemeProvider } from '@/theme/theme';
import { ApiProvider } from '@/trpc/trpc';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));

type Route = { status: number; body?: unknown };
function mockFetch(routes: Record<string, Route>) {
  globalThis.fetch = jest.fn(async (url: string) => {
    const r = routes[new URL(url).pathname] ?? { status: 404, body: {} };
    return new Response(JSON.stringify(r.body ?? {}), {
      status: r.status,
      headers: { 'content-type': 'application/json' },
    });
  }) as unknown as typeof fetch;
}

function renderConnect() {
  return render(
    <AppThemeProvider>
      <ApiProvider session={null}>
        <ConnectScreen />
      </ApiProvider>
    </AppThemeProvider>,
  );
}

describe('Connect Store', () => {
  beforeEach(() => mockPush.mockClear());

  it('probes a Spree 4.2-style store and shows what it supports', async () => {
    mockFetch({
      '/api/v2/platform/orders': { status: 401 },
      '/api/v2/storefront/store': {
        status: 200,
        body: { data: { attributes: { name: 'Northwind Supply', default_currency: 'USD' } } },
      },
    });
    await renderConnect();
    await fireEvent.changeText(screen.getByLabelText('Store address'), 'northwind.test');
    await fireEvent.press(screen.getByText('Check store'));

    expect(await screen.findByText('Northwind Supply')).toBeTruthy();
    expect(screen.getByText('Platform API v2 · Spree 4.2–5.x')).toBeTruthy();
    expect(screen.getByLabelText('View orders: available')).toBeTruthy();
    expect(screen.getByLabelText('Refund: not available')).toBeTruthy();

    await fireEvent.press(screen.getByText('Continue'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/sign-in',
      params: { url: 'https://northwind.test', api: 'platform-v2' },
    });
  });

  it('explains when the address is not a Spree store', async () => {
    mockFetch({});
    await renderConnect();
    await fireEvent.changeText(screen.getByLabelText('Store address'), 'example.com');
    await fireEvent.press(screen.getByText('Check store'));
    await waitFor(() => expect(screen.getByText(/doesn't look like a Spree store/)).toBeTruthy());
  });
});
