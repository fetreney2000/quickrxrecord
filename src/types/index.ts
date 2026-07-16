export type Peranan = "Pentadbir" | "Penjaga Stor" | "Kakitangan Farmasi" | "Kakitangan Klinik";

export interface Profile {
  id: string;
  nama: string;
  jawatan: string | null;
  peranan: Peranan;
  nama_pengguna: string;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface Item {
  id: string;
  kod_item: string;
  nama_item: string;
  nama_dagangan: string | null;
  kekuatan: string | null;
  id_kategori: string | null;
  id_bentuk: string | null;
  kuota: number | null;
  catatan: string | null;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemBatch {
  id: string;
  item_id: string;
  nombor_kelompok: string;
  tarikh_luput: string;
  kuantiti: number;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  nama: string;
  nombor_kad_pengenalan: string | null;
  nombor_pendaftaran_hospital: string | null;
  dokumen_lain: string | null;
  nombor_telefon: string | null;
  alamat: string | null;
  catatan: string | null;
  aktif: boolean;
  merged_into: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientItemAssignment {
  id: string;
  patient_id: string;
  item_id: string;
  dos: string | null;
  tarikh_mula_guna: string;
  dimulakan_oleh: string | null;
  tarikh_tamat_guna: string | null;
  ditamatkan_oleh: string | null;
  kakitangan_farmasi_perekod: string | null;
  aktif: boolean;
  sebab_tamat: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplyRecord {
  id: string;
  assignment_id: string;
  tarikh_dibekal: string;
  dos: string;
  tempoh_dibekal: string;
  kuantiti: number;
  batch_id: string | null;
  kakitangan_pembekal: string;
  catatan_bekalan: string | null;
  created_at: string;
}

export interface DoseHistory {
  id: string;
  assignment_id: string;
  tarikh: string;
  dos: string;
  aktif: boolean;
  catatan: string | null;
  created_at: string;
}

export interface ItemCategory {
  id: string;
  nama: string;
  created_at: string;
  updated_at: string;
}

export interface ItemForm {
  id: string;
  nama: string;
  created_at: string;
  updated_at: string;
}

export interface SupplyDuration {
  id: string;
  nama: string;
  created_at: string;
  updated_at: string;
}

export interface KategoriUbat {
  id: string;
  nama_kategori: string;
}

export interface BentukDos {
  id: string;
  nama_bentuk: string;
}

export interface DurasiBekalan {
  id: string;
  nama_durasi: string;
}

// Joined types for display
export interface PatientWithAssignments extends Patient {
  assignments?: AssignmentWithDetails[];
}

export interface AssignmentWithDetails extends PatientItemAssignment {
  item?: Item;
  patient?: Patient;
  supply_records?: SupplyRecord[];
  dose_history?: DoseHistory[];
}

export interface ItemWithBatches extends Item {
  item_batches?: ItemBatch[];
  kategori?: KategoriUbat;
  bentuk?: BentukDos;
}