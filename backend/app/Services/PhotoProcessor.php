<?php

namespace App\Services;

use RuntimeException;

class PhotoProcessor
{
    public const MAX_W = 800;
    public const MAX_H = 1067;

    /** Hasilkan JPEG rasio 3:4 (maks 800x1067, kualitas 85) ke $outPath. */
    public static function process(string $srcPath, string $outPath): void
    {
        $bytes = @file_get_contents($srcPath);
        $img = $bytes === false ? false : @imagecreatefromstring($bytes);
        if (!$img) {
            throw new RuntimeException('Foto tidak dapat dibaca.');
        }

        $w = imagesx($img);
        $h = imagesy($img);
        // Crop tengah ke 3:4
        $targetRatio = 3 / 4;
        if ($w / $h > $targetRatio) {
            $cw = (int) round($h * $targetRatio);
            $ch = $h;
            $cx = (int) floor(($w - $cw) / 2);
            $cy = 0;
        } else {
            $cw = $w;
            $ch = (int) round($w / $targetRatio);
            $cx = 0;
            $cy = (int) floor(($h - $ch) / 2);
        }

        $scale = min(1, self::MAX_W / $cw, self::MAX_H / $ch);
        $tw = max(1, (int) round($cw * $scale));
        $th = max(1, (int) round($ch * $scale));

        $dst = imagecreatetruecolor($tw, $th);
        imagefill($dst, 0, 0, imagecolorallocate($dst, 255, 255, 255)); // PNG transparan → latar putih
        imagecopyresampled($dst, $img, 0, 0, $cx, $cy, $tw, $th, $cw, $ch);
        imagejpeg($dst, $outPath, 85);
        imagedestroy($img);
        imagedestroy($dst);
    }
}
