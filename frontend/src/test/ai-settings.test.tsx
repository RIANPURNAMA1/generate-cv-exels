import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { Providers } from '../Providers';
import { DataPage } from '../pages/DataPage';
import { resetMock } from '../services/mockApi';
import { useWizard } from '../state/wizard';

function SeedTemplate({ children }: { children: ReactNode }) {
  const { dispatch } = useWizard();
  useEffect(() => {
    dispatch({ type: 'SET_TEMPLATE', template: { id: 't1', name: 'template_cv', placeholders: [] } });
  }, [dispatch]);
  return <>{children}</>;
}

describe('pengaturan AI dinamis (Claude / GPT / Gemini)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    resetMock();
  });

  it('app bar menampilkan status AI dan membuka dialog pengaturan', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <MemoryRouter initialEntries={['/template']}>
          <App />
        </MemoryRouter>
      </Providers>,
    );

    const aiButton = await screen.findByRole('button', { name: 'Pengaturan AI' });
    expect(await within(aiButton).findByText('Claude')).toBeInTheDocument();

    await user.click(aiButton);
    const dialog = await screen.findByRole('dialog', { name: 'Pengaturan AI' });
    const group = within(dialog).getByRole('radiogroup', { name: 'Penyedia AI' });
    expect(within(group).getByRole('radio', { name: /Claude/ })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /GPT/ })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /Gemini/ })).toBeInTheDocument();
    // Baris status penyedia terpilih.
    expect(within(dialog).getByText('Claude (Anthropic)')).toBeInTheDocument();
  });

  it('ganti penyedia AI dan simpan kunci dari dialog', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <MemoryRouter initialEntries={['/template']}>
          <App />
        </MemoryRouter>
      </Providers>,
    );

    await user.click(await screen.findByRole('button', { name: 'Pengaturan AI' }));
    const dialog = await screen.findByRole('dialog', { name: 'Pengaturan AI' });

    // Pilih Gemini, isi model dan kunci API.
    await user.click(within(dialog).getByRole('radio', { name: /Gemini/ }));
    await user.clear(within(dialog).getByLabelText('Model'));
    await user.type(within(dialog).getByLabelText('Model'), 'gemini-2.0-flash');
    await user.type(within(dialog).getByLabelText(/Kunci API/), 'kunci-demo');
    await user.click(within(dialog).getByRole('button', { name: 'Simpan pengaturan' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Pengaturan AI' })).not.toBeInTheDocument());

    // Penyedia aktif berubah di app bar.
    const aiButton = screen.getByRole('button', { name: 'Pengaturan AI' });
    await waitFor(() => expect(within(aiButton).getByText('Gemini')).toBeInTheDocument());
  });

  it('tab PDF menampilkan pemilih penyedia dan cara mengaktifkan AI', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <MemoryRouter initialEntries={['/data']}>
          <SeedTemplate>
            <DataPage />
          </SeedTemplate>
        </MemoryRouter>
      </Providers>,
    );

    await user.click(await screen.findByRole('tab', { name: 'Impor dari PDF (AI)' }));

    // Pemilih penyedia: Claude, GPT, Gemini.
    const group = await screen.findByRole('radiogroup', { name: 'Penyedia AI aktif' });
    expect(within(group).getByRole('radio', { name: /Claude/ })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /GPT/ })).toBeInTheDocument();
    expect(within(group).getByRole('radio', { name: /Gemini/ })).toBeInTheDocument();

    // Ganti ke Gemini (belum ada kunci di mock) → status berubah menjadi belum aktif.
    await user.click(within(group).getByRole('radio', { name: /Gemini/ }));
    expect(await screen.findByText(/Langkah AI belum aktif/)).toBeInTheDocument();

    // Banner menawarkan tombol membuka pengaturan AI.
    await user.click(screen.getByRole('button', { name: /Atur AI/ }));
    expect(await screen.findByRole('dialog', { name: 'Pengaturan AI' })).toBeInTheDocument();
  });
});
