<?php

/*
 * Tabel sinonim dropdown.
 * Struktur: kunci_field => [ bagian Indonesia pilihan (huruf kecil, tanpa （…）) => [sinonim...] ].
 * Bisa diperluas tanpa mengubah kode. Pencocokan tidak peka huruf besar/kecil.
 */
$tidak = ['tidak', 'no', 'nggak', 'ngga', 'gak', 'tdk', 'tidak ada', 'tidak punya', 'nihil', '-', '0', 'belum'];
$ya = ['ya', 'yes', 'ada', 'punya', 'iya', 'y'];

return [
    'jenis_kelamin' => [
        'laki-laki' => ['laki', 'laki laki', 'pria', 'cowok', 'male', 'l', 'm', '男'],
        'perempuan' => ['wanita', 'cewek', 'female', 'p', 'f', '女'],
    ],
    'status_nikah' => [
        'belum menikah' => ['belum kawin', 'lajang', 'single', 'bujang', 'belum nikah', '未婚'],
        'menikah' => ['kawin', 'sudah menikah', 'married', 'sudah nikah', '既婚'],
    ],
    'agama' => [
        'islam' => ['muslim', 'moslem'],
        'kristen' => ['protestan', 'kristen protestan'],
        'katolik' => ['katholik', 'katolik roma'],
        'hindu' => [],
        'buddha' => ['budha', 'buddhis'],
        'konghucu' => ['khonghucu', 'konfusius'],
    ],
    'pernah_ke_jepang' => [
        'belum pernah' => $tidak,
        'pernah' => ['sudah pernah', 'ya', 'ada'],
    ],
    'paspor' => [
        'belum punya' => array_merge($tidak, ['belum ada']),
        'sudah punya' => ['punya', 'ada', 'ya', 'sudah ada', 'sudah'],
    ],
    'tangan_dominan' => [
        'kanan' => ['right', 'tangan kanan'],
        'kiri' => ['left', 'tangan kiri'],
    ],
    'riwayat_penyakit' => ['tidak ada' => $tidak, 'ada' => $ya],
    'merokok' => ['tidak' => $tidak, 'ya' => array_merge($ya, ['merokok', 'perokok'])],
    'alkohol' => ['tidak' => $tidak, 'ya' => array_merge($ya, ['minum'])],
    'jlpt_ada' => ['ada' => $ya, 'tidak ada' => $tidak],
    'ssw_bidang' => [
        'perawatan lansia' => ['kaigo', 'caregiver', 'perawat lansia', '介護'],
        'pertanian' => ['agriculture', 'farming', '農業'],
        'pengolahan makanan' => ['makanan', 'food manufacturing', 'pabrik makanan'],
        'restoran' => ['gaishoku', 'food service', 'rumah makan'],
        'konstruksi' => ['bangunan', 'construction'],
        'manufaktur' => ['pabrik', 'manufacturing'],
        'tidak ada' => $tidak,
    ],
    'keluarga_hubungan' => [
        'ayah' => ['bapak', 'papa', 'bapa', 'father', '父'],
        'ibu' => ['mama', 'mamah', 'emak', 'mother', '母'],
        'kakak' => ['kk', 'kakak laki-laki', 'kakak perempuan', 'abang', 'kakak kandung', 'mbak', 'mas', '兄', '姉'],
        'adik' => ['adik laki-laki', 'adik perempuan', 'adik kandung', '弟', '妹'],
        'suami' => ['husband', '夫'],
        'istri' => ['isteri', 'wife', '妻'],
        'anak' => ['child', 'son', 'daughter', '子'],
    ],
    'kontak_darurat_hubungan' => [
        'ayah' => ['bapak', 'papa', 'father'], 'ibu' => ['mama', 'mother'],
        'kakak' => ['abang', 'mbak', 'mas'], 'adik' => [],
        'suami' => ['husband'], 'istri' => ['isteri', 'wife'],
    ],
    'kerabat_hubungan' => [
        'ayah' => ['bapak'], 'ibu' => ['mama'], 'kakak' => ['abang', 'mbak', 'mas'], 'adik' => [],
        'saudara' => ['sepupu', 'paman', 'bibi', 'om', 'tante', 'keluarga', 'kerabat'],
        'teman' => ['sahabat', 'friend'],
    ],
];
