import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { Providers } from '../Providers';
import { resetMock } from '../services/mockApi';

function templateFile(): File {
  const ws: XLSX.WorkSheet = {
    E9: { t: 's', v: '{nama_romaji}' },
    A21: { t: 's', v: '{alamat}' },
    '!ref': 'A1:O30',
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CV');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([out], 'template_cv.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('halaman template (redesign M3)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    resetMock();
  });

  it('menampilkan stepper, dropzone, dan status tahap di baris bawah', async () => {
    render(
      <Providers>
        <MemoryRouter initialEntries={['/template']}>
          <App />
        </MemoryRouter>
      </Providers>,
    );

    expect(await screen.findByRole('navigation', { name: 'Tahapan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Pilih file dari komputer/ })).toBeInTheDocument();
    expect(screen.getByText('Microsoft Excel (.xlsx)')).toBeInTheDocument();
    expect(screen.getByText('0 Variabel')).toBeInTheDocument();

    // Barisstatus bawah: pill tahap + CTA yang nonaktif sebelum template dipilih.
    expect(screen.getByText('Tahap 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Lanjut ke data peserta/ })).toBeDisabled();
  });

  it('menampilkan placeholder, daftar template Drive, dan aksi auto-detect', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <MemoryRouter initialEntries={['/template']}>
          <App />
        </MemoryRouter>
      </Providers>,
    );

    await user.upload(screen.getByLabelText('Upload template CV (.xlsx)'), templateFile());

    const panel = within(screen.getByRole('region', { name: /Placeholder terdeteksi/ }));
    expect(await panel.findByText('{nama_romaji}')).toBeInTheDocument();
    expect(panel.getByText('2 Variabel')).toBeInTheDocument();

    // Sidebar "Template saya" memuat template yang baru diunggah.
    const sidebar = within(screen.getByRole('region', { name: /Template saya/ }));
    expect(await sidebar.findByText('template_cv')).toBeInTheDocument();
    expect(sidebar.getByText('Dipakai')).toBeInTheDocument();

    // Pencarian Drive menyaring daftar.
    await user.type(screen.getByLabelText('Cari template di Google Drive'), 'tidak-ada');
    expect(await screen.findByText('Tidak ada template yang cocok')).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Cari template di Google Drive'));

    // Auto-detect memindai ulang berkas lokal.
    await user.click(screen.getByRole('button', { name: /Auto-detect/ }));
    await waitFor(() => expect(screen.getByText(/Auto-detect selesai/)).toBeInTheDocument());
  });
});
