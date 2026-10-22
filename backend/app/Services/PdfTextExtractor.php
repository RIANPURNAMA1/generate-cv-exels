<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Ekstraksi teks dari PDF memakai pdftotext (poppler).
 * Dipakai untuk penyedia yang tidak menerima PDF secara native (mis. OpenAI).
 */
class PdfTextExtractor
{
    public static function available(): bool
    {
        $p = new Process(['pdftotext', '-v']);
        $p->setTimeout(10);
        try {
            $p->run();
        } catch (\Throwable) {
            return false;
        }
        return $p->getExitCode() === 0;
    }

    /** @return string teks hasil ekstraksi */
    public static function extract(string $pdfPath): string
    {
        if (! self::available()) {
            throw new RuntimeException('Ekstraksi teks PDF butuh pdftotext (poppler) yang belum terpasang di server.');
        }
        $p = new Process(['pdftotext', '-layout', '-enc', 'UTF-8', $pdfPath, '-']);
        $p->setTimeout(60);
        $p->run();
        if (! $p->isSuccessful()) {
            throw new RuntimeException('Teks PDF tidak dapat dibaca.');
        }
        $text = trim($p->getOutput());
        if ($text === '') {
            throw new RuntimeException('PDF tidak berisi teks yang dapat dibaca (kemungkinan hasil pindaian).');
        }
        return $text;
    }

    /** Ekstraksi dari isi berkas di memori (ditulis ke berkas sementara lebih dulu). */
    public static function extractFromBytes(string $bytes): string
    {
        $tmp = tempnam(sys_get_temp_dir(), 'pdftext_');
        if ($tmp === false) {
            throw new RuntimeException('Berkas sementara tidak dapat dibuat.');
        }
        try {
            file_put_contents($tmp, $bytes);
            return self::extract($tmp);
        } finally {
            @unlink($tmp);
        }
    }
}
