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
    E9: { t: 's', v: '{nama_romaji}' }, E13: { t: 's', v: '{tempat_lahir}' }, A21: { t: 's', v: '{alamat}' }, A5: { t: 's', v: '{foto}' },
    '!ref': 'A1:O30', '!merges': [XLSX.utils.decode_range('A5:D18')],
  };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'CV');
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return new File([out], 'template_cv.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

describe('alur end-to-end (mode MOCK)', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_USE_MOCK', 'true');
    resetMock();
  });

  it('template → peserta manual → pencocokan → hasil unduhan', async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <MemoryRouter initialEntries={['/template']}>
          <App />
        </MemoryRouter>
      </Providers>,
    );

    // 1. Template
    expect(await screen.findByText(/Langkah 1 · Template/)).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Upload template CV (.xlsx)'), templateFile());
    expect(await screen.findByText('{nama_romaji}')).toBeInTheDocument();
    expect(screen.getByText('A5 (A5:D18)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Lanjut ke data peserta/ }));

    // 2. Data peserta (input manual dengan validasi)
    await user.click(await screen.findByRole('tab', { name: 'Input manual' }));
    await user.click(screen.getByRole('button', { name: 'Simpan peserta' }));
    expect(await screen.findAllByText('Nama (romaji) wajib diisi.')).not.toHaveLength(0);
    await user.type(screen.getByLabelText('Nama (romaji) / 氏名'), 'Retno Wulandari');
    await user.type(screen.getByLabelText('Alamat / 住所'), 'Jl. Merdeka No. 1');
    await user.click(screen.getByRole('button', { name: 'Simpan peserta' }));
    expect(await screen.findByText('Peserta (1)')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Lanjut ke pencocokan/ }));

    // 3. Pencocokan: auto-match + peringatan foto, lalu buat CV
    expect(await screen.findByText(/Langkah 3 · Pencocokan/)).toBeInTheDocument();
    const alamatSelect = screen.getByLabelText('Kolom untuk alamat') as HTMLSelectElement;
    await waitFor(() => expect(alamatSelect.value).toBe('alamat'));
    expect(screen.getByText('Foto belum ada.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Buat CV \(1\)/ }));

    // 4. Hasil
    expect(await screen.findByText(/Langkah 4 · Hasil/)).toBeInTheDocument();
    const link = await screen.findByRole('link', { name: 'Unduh .xlsx' }, { timeout: 4000 });
    expect(link).toHaveAttribute('href');
    const item = link.closest('li');
    expect(item && within(item).getByText('RETNO WULANDARI')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Buat lagi dengan template yang sama' })).toBeInTheDocument();
  });
});
