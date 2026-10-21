<?php

/*
 * Satu sumber kebenaran katalog placeholder CV.
 * Tipe: text, number, date, dropdown, textarea, photo.
 * 'ai'   : null | 'katakana' | 'translate' | 'equivalent'
 * 'group': null | pendidikan | kerja | keluarga (placeholder berulang, N = nomor baris)
 */

$fields = [];

$add = function (string $name, string $label, string $type = 'text', array $extra = []) use (&$fields) {
    $fields[$name] = array_merge([
        'name' => $name,
        'label' => $label,
        'type' => $type,
        'format' => null,
        'ai' => null,
        'group' => null,
        'computed' => false,
    ], $extra);
};

// Data diri
$add('nama_katakana', 'Nama (katakana) / 氏名カナ', 'text', ['ai' => 'katakana']);
$add('nama_romaji', 'Nama (romaji) / 氏名ローマ字', 'text', ['format' => 'upper']);
$add('tanggal_lahir', 'Tanggal lahir / 生年月日 (input)', 'date', ['format' => 'date']);
$add('tanggal_lahir_jp', 'Tanggal lahir format Jepang', 'text', ['format' => 'date_jp', 'computed' => true]);
$add('tempat_lahir', 'Tempat lahir / 出生地', 'text', ['ai' => 'katakana']);
$add('usia', 'Usia / 年齢', 'number', ['format' => 'age', 'computed' => true]);
$add('jenis_kelamin', 'Jenis kelamin / 性別', 'dropdown');
$add('no_hp', 'No. HP / 電話番号', 'text', ['format' => 'phone']);
$add('alamat', 'Alamat / 住所', 'textarea');
$add('kontak_darurat_telp', 'Telp. kontak darurat', 'text', ['format' => 'phone']);
$add('kontak_darurat_hubungan', 'Hubungan kontak darurat', 'dropdown');
$add('foto', 'Foto / 写真', 'photo');

// Fisik
$add('tinggi', 'Tinggi (cm) / 身長', 'number');
$add('berat', 'Berat (kg) / 体重', 'number');
$add('ukuran_sepatu', 'Ukuran sepatu / 靴', 'number');
$add('lingkar_pinggang', 'Lingkar pinggang / ウエスト', 'number');
$add('golongan_darah', 'Golongan darah / 血液型', 'text', ['format' => 'upper']);
$add('penglihatan_kanan', 'Penglihatan kanan / 視力(右)', 'text');
$add('penglihatan_kiri', 'Penglihatan kiri / 視力(左)', 'text');

// Status
foreach ([
    'status_nikah' => 'Status nikah / 婚姻',
    'agama' => 'Agama / 宗教',
    'pernah_ke_jepang' => 'Pernah ke Jepang / 渡日歴',
    'paspor' => 'Paspor / パスポート',
    'tangan_dominan' => 'Tangan dominan / 利き手',
    'riwayat_penyakit' => 'Riwayat penyakit / 病歴',
    'merokok' => 'Merokok / 喫煙',
    'alkohol' => 'Alkohol / 飲酒',
] as $n => $l) {
    $add($n, $l, 'dropdown');
}

// Grup berulang
for ($n = 1; $n <= 4; $n++) {
    $g = ['group' => 'pendidikan'];
    $add("pendidikan_{$n}_mulai", "Pendidikan {$n}: mulai", 'date', $g + ['format' => 'period']);
    $add("pendidikan_{$n}_selesai", "Pendidikan {$n}: selesai", 'date', $g + ['format' => 'period']);
    $add("pendidikan_{$n}_sekolah", "Pendidikan {$n}: sekolah", 'text', $g);
    $add("pendidikan_{$n}_jurusan", "Pendidikan {$n}: jurusan", 'text', $g + ['ai' => 'equivalent']);
}
for ($n = 1; $n <= 4; $n++) {
    $g = ['group' => 'kerja'];
    $add("kerja_{$n}_mulai", "Kerja {$n}: mulai", 'date', $g + ['format' => 'period']);
    $add("kerja_{$n}_selesai", "Kerja {$n}: selesai", 'date', $g + ['format' => 'period']);
    $add("kerja_{$n}_perusahaan", "Kerja {$n}: perusahaan", 'text', $g);
    $add("kerja_{$n}_jenis", "Kerja {$n}: jenis pekerjaan", 'text', $g + ['ai' => 'equivalent']);
    $add("kerja_{$n}_gaji", "Kerja {$n}: gaji", 'text', $g + ['format' => 'money']);
}
for ($n = 1; $n <= 5; $n++) {
    $g = ['group' => 'keluarga'];
    $add("keluarga_{$n}_hubungan", "Keluarga {$n}: hubungan", 'dropdown', $g);
    $add("keluarga_{$n}_nama", "Keluarga {$n}: nama", 'text', $g + ['ai' => 'katakana']);
    $add("keluarga_{$n}_usia", "Keluarga {$n}: usia", 'text', $g + ['format' => 'family_age']);
    $add("keluarga_{$n}_pekerjaan", "Keluarga {$n}: pekerjaan", 'text', $g + ['ai' => 'equivalent']);
    $add("keluarga_{$n}_gaji", "Keluarga {$n}: gaji", 'text', $g + ['format' => 'money_family']);
}

// Informasi personal
foreach ([
    'promosi_diri' => 'Promosi diri / 自己PR',
    'tujuan_ke_jepang' => 'Tujuan ke Jepang / 日本へ行く目的',
    'tujuan_setelah_pulang' => 'Tujuan setelah pulang / 帰国後の目標',
    'kelebihan' => 'Kelebihan / 長所',
    'kekurangan' => 'Kekurangan / 短所',
    'keahlian' => 'Keahlian / 特技',
    'hobi' => 'Hobi / 趣味',
] as $n => $l) {
    $add($n, $l, 'textarea', ['ai' => 'translate']);
}

// Sertifikat
$add('jlpt_ada', 'Punya JLPT / JLPT有無', 'dropdown');
$add('jlpt_level', 'Level JLPT', 'text', ['format' => 'upper']);
$add('sim_status', 'SIM (status + jenis) / 運転免許', 'text');
$add('ssw_bidang', 'Bidang SSW / 特定技能分野', 'dropdown');

// Kerabat di Jepang
$add('kerabat_nama', 'Kerabat di Jepang: nama', 'text');
$add('kerabat_hubungan', 'Kerabat di Jepang: hubungan', 'dropdown');
$add('kerabat_pekerjaan', 'Kerabat di Jepang: pekerjaan', 'text', ['ai' => 'equivalent']);
$add('kerabat_usia', 'Kerabat di Jepang: usia', 'text', ['format' => 'family_age']);
$add('kerabat_alamat', 'Kerabat di Jepang: alamat', 'textarea');
$add('catatan_tambahan', 'Catatan tambahan / 備考', 'textarea');

return [
    'fields' => $fields,

    // Sel hasil dengan shrink_to_fit; sisanya yang cocok wrap_patterns memakai wrap_text.
    'shrink_patterns' => [
        '/^tanggal_lahir_jp$/', '/^nama_/', '/_mulai$/', '/_selesai$/',
        '/_sekolah$/', '/_perusahaan$/', '/_jurusan$/', '/^keluarga_\d+_nama$/',
    ],
    'wrap_patterns' => [
        '/^(promosi_diri|tujuan_ke_jepang|tujuan_setelah_pulang|kelebihan|kekurangan|keahlian|hobi|alamat|catatan_tambahan|kerabat_alamat)$/',
    ],

    // Pemetaan sel template contoh (dipakai template:generate-sample dan dokumentasi)
    'sample_cells' => [
        'E8' => 'nama_katakana', 'E9' => 'nama_romaji', 'E11' => 'tanggal_lahir_jp',
        'E13' => 'tempat_lahir', 'G14' => 'usia', 'G15' => 'jenis_kelamin', 'G16' => 'no_hp',
        'A21' => 'alamat', 'H22' => 'kontak_darurat_telp', 'J22' => 'kontak_darurat_hubungan',
        'L5' => 'tinggi', 'L6' => 'berat', 'L7' => 'ukuran_sepatu', 'L8' => 'lingkar_pinggang',
        'L9' => 'golongan_darah', 'M10' => 'penglihatan_kanan', 'O10' => 'penglihatan_kiri',
        'L11' => 'status_nikah', 'L12' => 'agama', 'L13' => 'pernah_ke_jepang', 'L14' => 'paspor',
        'L15' => 'tangan_dominan', 'L16' => 'riwayat_penyakit', 'L17' => 'merokok', 'L18' => 'alkohol',
        'E43' => 'promosi_diri', 'E44' => 'tujuan_ke_jepang', 'E45' => 'tujuan_setelah_pulang',
        'E47' => 'kelebihan', 'E48' => 'kekurangan', 'E49' => 'keahlian', 'E50' => 'hobi',
        'D52' => 'jlpt_ada', 'E52' => 'jlpt_level', 'I52' => 'sim_status', 'L52' => 'ssw_bidang',
        'A56' => 'kerabat_nama', 'E56' => 'kerabat_hubungan', 'G56' => 'kerabat_pekerjaan',
        'I56' => 'kerabat_usia', 'K56' => 'kerabat_alamat', 'A58' => 'catatan_tambahan',
        'A5' => 'foto',
    ],
    // grup => [baris awal, jumlah baris, kolom => sub-field]
    'sample_rows' => [
        'pendidikan' => [25, 4, ['A' => 'mulai', 'D' => 'selesai', 'E' => 'sekolah', 'I' => 'jurusan']],
        'kerja' => [31, 4, ['A' => 'mulai', 'D' => 'selesai', 'E' => 'perusahaan', 'I' => 'jenis', 'N' => 'gaji']],
        'keluarga' => [37, 5, ['A' => 'hubungan', 'E' => 'nama', 'I' => 'usia', 'J' => 'pekerjaan', 'N' => 'gaji']],
    ],
    'sample_merges' => [
        'A5:D18', 'E8:K8', 'E9:K9', 'E11:K11', 'E13:K13', 'A21:O21', 'E43:O43', 'E44:O44',
        'E45:O45', 'E47:O47', 'E48:O48', 'E49:O49', 'E50:O50', 'A58:O58',
    ],
];
