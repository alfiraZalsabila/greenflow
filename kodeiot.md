/*
  SMART IRRIGATION SAWI - v4 (ESP32 + Firebase Realtime Database)
  Monitoring + kontrol + riwayat siram. Kontrol lewat Serial Monitor tetap jalan.

  Komponen: 3 sensor tanah, DHT11, relay 1 channel (pompa), LCD I2C 16x2,
            RTC DS1307, buzzer aktif

  Library (Library Manager):
    - DHT sensor library (Adafruit) + Adafruit Unified Sensor
    - LiquidCrystal I2C (Frank de Brabander)
    - RTClib (Adafruit)
    (Firebase memakai REST API lewat HTTPClient bawaan ESP32, tanpa library tambahan)

  Firebase dijalankan di task terpisah (core 0), jadi koneksi lambat/putus
  TIDAK mengganggu pembacaan sensor, buzzer, dan pengaman pompa.

  Struktur data di Realtime Database:
    /irigasi/status   : data terbaru (ditimpa tiap 5 detik)
    /irigasi/kontrol  : perintah dari web/app (dibaca tiap 2 detik)
                        { mode:"auto"|"manual", aksi:"on"|"off"|"siram"|"reset"|"", detik:5, id:0 }
                        Aksi dijalankan SEKALI setiap nilai "id" berubah (naikkan id tiap kirim perintah).
    /irigasi/riwayat  : satu entri baru tiap pompa selesai menyiram

  Serial Monitor: baud 115200, baris akhir = "Newline". Ketik "help".
*/

#include <Wire.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>

// ======================= PIN =======================
const int PIN_SOIL[3] = {34, 35, 32};
const int PIN_DHT     = 4;
const int PIN_RELAY   = 26;
const int PIN_BUZZER  = 25;

// Relay modul umumnya aktif LOW. Ubah ke false jika relay Anda aktif HIGH.
const bool RELAY_ACTIVE_LOW  = true;
// Buzzer aktif biasa: bunyi saat HIGH. Modul buzzer "low level trigger": ubah ke true.
const bool BUZZER_ACTIVE_LOW = false;

// ======================= WIFI =======================
const bool WIFI_AKTIF = true;
const char* WIFI_SSID = "";       // WiFi 2,4 GHz
const char* WIFI_PASS = "";
const unsigned long WIFI_RETRY_MS = 30000UL;

// ======================= FIREBASE =======================
const bool  FIREBASE_AKTIF = true;
// URL Realtime Database, TANPA garis miring di akhir
const char* FB_HOST = "https://irigasisawi-a28c1-default-rtdb.asia-southeast1.firebasedatabase.app/";
// Database secret (Project settings > Service accounts > Database secrets).
// Kosongkan ("") jika rules database dibuka untuk uji.
const char* FB_AUTH = "Nv1GhlCybsI8VSWhvhLjtlGHjdAVT2NSR0f2WoKI";
const char* FB_ROOT = "/irigasi";
const unsigned long FB_PUSH_MS = 5000UL;   // kirim status tiap 5 detik
const unsigned long FB_POLL_MS = 2000UL;   // cek perintah tiap 2 detik

// ======================= KALIBRASI TANAH =======================
const int SOIL_WET[3] = {1074, 1096, 1070};   // jenuh
const int SOIL_DRY[3] = {2718, 2528, 2627};   // SEMENTARA

// Kategori (persen): KERING < 30, NORMAL 30-78, BASAH > 78
// Titik NORMAL hasil lapangan: S1 ~1817, S2 ~1672, S3 ~1778 (sekitar 55%)

// ======================= BATAS KESELAMATAN POMPA =======================
const unsigned long MAX_PUMP_MS    = 10000UL;   // maksimum siram otomatis
const unsigned long MANUAL_MAX_MS  = 15000UL;   // maksimum siram manual
const unsigned long COOLDOWN_MS    = 300000UL;  // jeda antar siram otomatis (5 menit)
const float         MIN_DURATION_S = 1.0;

const unsigned long SENSE_MS = 2000UL;

// true  = raw >= 3500 (sensor di udara) dianggap tanah KERING (0%), cocok untuk uji
// false = dianggap sensor lepas, diabaikan; jika SEMUA lepas, pompa tidak menyala
const bool UDARA_DIANGGAP_KERING = true;
const int  RAW_UDARA = 3500;

// ======================= BUZZER: PENGATURAN ALARM =======================
const bool BEEP_POMPA = true;                         // bip pendek saat pompa menyala
const unsigned long KERING_ULANG_MS      = 600000UL;  // ulang peringatan kering tiap 10 menit
const unsigned long ERROR_ULANG_MS       = 300000UL;  // ulang peringatan sensor error tiap 5 menit

// ======================= OBJEK =======================
DHT dht(PIN_DHT, DHT11);
LiquidCrystal_I2C lcd(0x27, 16, 2);   // alamat bisa 0x3F
RTC_DS1307 rtc;                       // jika DS3231: RTC_DS3231 rtc; dan isrunning() -> lostPower()
bool rtcOk = false;

// ======================= STATE =======================
int   rawSoil[3] = {0, 0, 0};
float pctSoil[3] = {0, 0, 0};
float soilAvg    = 0;
float tempC      = 29.0;
float humAir     = 0;
bool  semuaLepas = false;
bool  dhtValid   = false;
int   dhtFail    = 0;
float fuzzySec   = 0;
const char* kategori = "NORMAL";

bool          pumpOn       = false;
bool          pumpManual   = false;
unsigned long pumpStart    = 0;
unsigned long pumpDurMs    = 0;
unsigned long lastWaterEnd = 0;
bool          hasWatered   = false;
float         pumpSoilStart = 0;   // kelembapan tanah saat pompa mulai (untuk riwayat)

bool modeManual = false;    // false = otomatis (fuzzy), true = manual
bool logOn      = true;
bool muted      = false;    // buzzer dibisukan
unsigned long tSense = 0, tWifiCheck = 0, tWifiRetry = 0;

// status alarm
bool keringAktif = false, errAktif = false;
bool wifiWasConnected = false;
unsigned long tKeringBeep = 0, tErrBeep = 0;

String cmdBuf;
char lastWaterStr[20] = "-";

// ======================= FIREBASE: DATA BERSAMA ANTAR TASK =======================
struct Snap {
  bool  valid;
  int   raw[3];
  float pct[3];
  float avg;
  char  kat[8];
  float t, h;
  bool  dhtOk;
  float fuzzy;
  bool  manual;
  bool  pumpOn;
  long  cd;
  char  last[20];
  char  now[20];
};

struct Hist {
  char  waktu[20];
  float durasi;
  bool  manual;
  float tanahAwal;
  float suhu;
  char  alasan[24];
};

Snap snap = {};
SemaphoreHandle_t fbMutex = nullptr;
QueueHandle_t     histQ   = nullptr;
WiFiClientSecure  fbClient;
HTTPClient        fbHttp;

volatile bool fbPushNow   = false;   // paksa kirim status segera
volatile bool fbHasPending = false;  // ada perintah dari Firebase untuk dijalankan
volatile int  fbState     = 0;       // 0 = belum tahu, 1 = ok, 2 = gagal
char pendMode[8]  = "";
char pendCmd[24]  = "";

// Waktu RTC sebagai teks "YYYY-MM-DD HH:MM:SS" (HANYA dipanggil dari loop utama)
const char* nowStr() {
  static char buf[20];
  if (!rtcOk) { snprintf(buf, sizeof(buf), "RTC-ERR"); return buf; }
  DateTime n = rtc.now();
  snprintf(buf, sizeof(buf), "%04d-%02d-%02d %02d:%02d:%02d",
           n.year(), n.month(), n.day(), n.hour(), n.minute(), n.second());
  return buf;
}

// ======================= BUZZER (non-blocking, antrean pola) =======================
// Tiap pola: urutan durasi ON, OFF, ON, OFF, ... (ms)
#define P_BOOT        0   // 1 bip pendek
#define P_WIFI_OK     1   // 2 bip pendek
#define P_WIFI_PUTUS  2   // 1 pendek + 1 panjang
#define P_KERING      3   // 2 bip sedang
#define P_POMPA       4   // 1 bip sangat pendek
#define P_ERROR       5   // 1 bip panjang

const uint16_t SEQ_BOOT[]       = {100};
const uint16_t SEQ_WIFI_OK[]    = {100, 100, 100};
const uint16_t SEQ_WIFI_PUTUS[] = {100, 100, 600};
const uint16_t SEQ_KERING[]     = {300, 200, 300};
const uint16_t SEQ_POMPA[]      = {60};
const uint16_t SEQ_ERROR[]      = {1000};

struct SeqDef { const uint16_t* d; uint8_t n; };
const SeqDef SEQS[] = {
  {SEQ_BOOT, 1}, {SEQ_WIFI_OK, 3}, {SEQ_WIFI_PUTUS, 3}, {SEQ_KERING, 3},
  {SEQ_POMPA, 1}, {SEQ_ERROR, 1}
};

const uint8_t QMAX = 8;
uint8_t qBuf[QMAX];
uint8_t qHead = 0, qTail = 0, qCount = 0;
bool buzzPlaying = false;
const SeqDef* buzzCur = nullptr;
uint8_t buzzIdx = 0;
unsigned long buzzNext = 0, buzzGapUntil = 0;

void buzzWrite(bool on) {
  digitalWrite(PIN_BUZZER, (on ^ BUZZER_ACTIVE_LOW) ? HIGH : LOW);
}

void buzz(uint8_t p) {
  if (muted || qCount >= QMAX) return;
  qBuf[qTail] = p;
  qTail = (qTail + 1) % QMAX;
  qCount++;
}

void buzzUpdate() {
  unsigned long now = millis();
  if (muted) {
    if (buzzPlaying) { buzzWrite(false); buzzPlaying = false; }
    qHead = qTail = qCount = 0;
    return;
  }
  if (!buzzPlaying) {
    if (qCount == 0 || (long)(now - buzzGapUntil) < 0) return;
    buzzCur = &SEQS[qBuf[qHead]];
    qHead = (qHead + 1) % QMAX;
    qCount--;
    buzzIdx = 0;
    buzzPlaying = true;
    buzzWrite(true);
    buzzNext = now + buzzCur->d[0];
    return;
  }
  if ((long)(now - buzzNext) < 0) return;
  buzzIdx++;
  if (buzzIdx >= buzzCur->n) {
    buzzWrite(false);
    buzzPlaying = false;
    buzzGapUntil = now + 500;       // jeda antar pola
    return;
  }
  buzzWrite(buzzIdx % 2 == 0);      // indeks genap = ON, ganjil = OFF
  buzzNext = now + buzzCur->d[buzzIdx];
}

// ======================= FIREBASE: SNAPSHOT & RIWAYAT (dipanggil dari loop utama) =======================
long cooldownSisaDetik();

void fbUpdateSnap() {
  if (!FIREBASE_AKTIF) return;
  char nb[20];
  strncpy(nb, nowStr(), sizeof(nb) - 1);
  nb[sizeof(nb) - 1] = '\0';
  long cd = cooldownSisaDetik();

  xSemaphoreTake(fbMutex, portMAX_DELAY);
  for (int i = 0; i < 3; i++) { snap.raw[i] = rawSoil[i]; snap.pct[i] = pctSoil[i]; }
  snap.avg = soilAvg;
  strncpy(snap.kat, kategori, sizeof(snap.kat) - 1);
  snap.kat[sizeof(snap.kat) - 1] = '\0';
  snap.t = tempC;
  snap.h = humAir;
  snap.dhtOk = dhtValid;
  snap.fuzzy = fuzzySec;
  snap.manual = modeManual;
  snap.pumpOn = pumpOn;
  snap.cd = cd;
  strncpy(snap.last, lastWaterStr, sizeof(snap.last) - 1);
  snap.last[sizeof(snap.last) - 1] = '\0';
  strncpy(snap.now, nb, sizeof(snap.now) - 1);
  snap.now[sizeof(snap.now) - 1] = '\0';
  snap.valid = true;
  xSemaphoreGive(fbMutex);
}

void fbQueueHist(float durasi, bool manual, const char* alasan) {
  if (!FIREBASE_AKTIF) return;
  Hist h;
  strncpy(h.waktu, nowStr(), sizeof(h.waktu) - 1);
  h.waktu[sizeof(h.waktu) - 1] = '\0';
  h.durasi = durasi;
  h.manual = manual;
  h.tanahAwal = pumpSoilStart;
  h.suhu = tempC;
  strncpy(h.alasan, alasan, sizeof(h.alasan) - 1);
  h.alasan[sizeof(h.alasan) - 1] = '\0';
  xQueueSend(histQ, &h, 0);          // jika antrean penuh, entri baru dibuang
  fbPushNow = true;
}

// Perintah dari Firebase dijalankan di loop utama lewat runCommand()
void runCommand(String c);

void fbApplyPending() {
  if (!fbHasPending) return;
  char m[8], c[24];
  xSemaphoreTake(fbMutex, portMAX_DELAY);
  strncpy(m, pendMode, sizeof(m));  m[sizeof(m) - 1] = '\0';
  strncpy(c, pendCmd, sizeof(c));   c[sizeof(c) - 1] = '\0';
  pendMode[0] = '\0';
  pendCmd[0]  = '\0';
  fbHasPending = false;
  xSemaphoreGive(fbMutex);

  if (m[0]) { Serial.printf("[Firebase] mode -> %s\n", m); runCommand(String(m)); }
  if (c[0]) { Serial.printf("[Firebase] perintah -> %s\n", c); runCommand(String(c)); }
}

// ======================= RELAY / POMPA =======================
void relayWrite(bool on) {
  digitalWrite(PIN_RELAY, (on ^ RELAY_ACTIVE_LOW) ? HIGH : LOW);
}

void pumpStartFor(unsigned long ms, bool manual) {
  pumpDurMs  = ms;
  pumpStart  = millis();
  pumpOn     = true;
  pumpManual = manual;
  pumpSoilStart = soilAvg;
  relayWrite(true);
  if (BEEP_POMPA) buzz(P_POMPA);
  Serial.printf("[%s] >> POMPA ON selama %.1f detik (%s)\n", nowStr(), ms / 1000.0, manual ? "manual" : "otomatis");
  fbUpdateSnap();
  fbPushNow = true;
}

void pumpStop(const char* alasan) {
  if (!pumpOn) return;
  unsigned long dur = millis() - pumpStart;
  pumpOn = false;
  relayWrite(false);
  lastWaterEnd = millis();
  hasWatered   = true;
  strncpy(lastWaterStr, nowStr(), sizeof(lastWaterStr) - 1);
  lastWaterStr[sizeof(lastWaterStr) - 1] = '\0';
  Serial.printf("[%s] >> POMPA OFF (%s), menyala %.1f detik\n", nowStr(), alasan, dur / 1000.0);
  fbQueueHist(dur / 1000.0f, pumpManual, alasan);
  fbUpdateSnap();
}

// ======================= SENSOR TANAH & DHT =======================
int readSoilRaw(int pin) {
  long sum = 0;
  for (int i = 0; i < 10; i++) { sum += analogRead(pin); delay(2); }
  return sum / 10;
}

float soilPercent(int i, int raw) {
  float p = (float)(SOIL_DRY[i] - raw) / (SOIL_DRY[i] - SOIL_WET[i]) * 100.0;
  return constrain(p, 0.0, 100.0);
}

const char* soilCategory(float p) {
  if (p < 30)  return "KERING";
  if (p <= 78) return "NORMAL";
  return "BASAH";
}

void readSensors() {
  float sum = 0; int n = 0;
  for (int i = 0; i < 3; i++) {
    rawSoil[i] = readSoilRaw(PIN_SOIL[i]);
    pctSoil[i] = soilPercent(i, rawSoil[i]);
    if (rawSoil[i] <= 200) continue;                    // kabel putus/korslet, diabaikan
    if (rawSoil[i] >= RAW_UDARA) {                      // sensor di udara
      if (UDARA_DIANGGAP_KERING) { sum += 0; n++; }
      continue;
    }
    sum += pctSoil[i]; n++;
  }
  semuaLepas = (n == 0);
  soilAvg = (n > 0) ? sum / n : 0;

  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t) && !isnan(h)) {
    tempC = t; humAir = h; dhtValid = true; dhtFail = 0;
  } else if (++dhtFail >= 5) {
    dhtValid = false;
  }
  kategori = semuaLepas ? "LEPAS" : soilCategory(soilAvg);
}

// ======================= FUZZY SUGENO ORDE NOL =======================
float trap(float x, float a, float b, float c, float d) {
  if (x < a || x > d) return 0;
  if (x >= b && x <= c) return 1;
  if (x < b) return (x - a) / (b - a);
  return (d - x) / (d - c);
}

// Baris: tanah (Kering, Normal, Basah). Kolom: suhu (Sejuk, Normal, Panas). Satuan detik.
const float RULE_Z[3][3] = {
  {3, 6, 10},
  {0, 3, 6},
  {0, 0, 0}
};

float fuzzySugeno(float soilP, float t) {
  float ms[3] = {
    trap(soilP, -1000, -1000, 20, 40),
    trap(soilP, 20, 40, 68, 88),
    trap(soilP, 68, 88, 1000, 1000)
  };
  float mt[3] = {
    trap(t, -1000, -1000, 25, 29),
    trap(t, 25, 29, 31, 35),
    trap(t, 31, 35, 1000, 1000)
  };
  float sumW = 0, sumWZ = 0;
  for (int i = 0; i < 3; i++)
    for (int j = 0; j < 3; j++) {
      float w = min(ms[i], mt[j]);
      sumW  += w;
      sumWZ += w * RULE_Z[i][j];
    }
  return (sumW > 0) ? sumWZ / sumW : 0;
}

// ======================= WIFI =======================
void wifiTask(unsigned long now) {
  if (now - tWifiCheck < 1000) return;
  tWifiCheck = now;
  bool ok = (WiFi.status() == WL_CONNECTED);
  if (ok && !wifiWasConnected) {
    wifiWasConnected = true;
    Serial.printf("[%s] WiFi tersambung, IP %s\n", nowStr(), WiFi.localIP().toString().c_str());
    buzz(P_WIFI_OK);
  } else if (!ok && wifiWasConnected) {
    wifiWasConnected = false;
    Serial.printf("[%s] WiFi terputus\n", nowStr());
    buzz(P_WIFI_PUTUS);
  }
  if (!ok && now - tWifiRetry >= WIFI_RETRY_MS) {
    tWifiRetry = now;
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
  }
}

// ======================= FIREBASE: TASK (core 0) =======================
// Request REST. Mengembalikan kode HTTP (<0 = gagal koneksi). resp diisi jika tidak null.
int fbRequest(const char* method, const char* sub, const String& body, String* resp) {
  String url = String(FB_HOST) + FB_ROOT + sub + ".json";
  bool q = false;
  if (strlen(FB_AUTH) > 0) { url += "?auth="; url += FB_AUTH; q = true; }
  if (!resp) url += q ? "&print=silent" : "?print=silent";

  fbHttp.setReuse(true);
  fbHttp.setTimeout(4000);
  fbHttp.setConnectTimeout(4000);
  if (!fbHttp.begin(fbClient, url)) return -1;

  int code;
  if (strcmp(method, "GET") == 0) {
    code = fbHttp.GET();
  } else {
    fbHttp.addHeader("Content-Type", "application/json");
    code = fbHttp.sendRequest(method, body);
  }
  if (code > 0 && resp) *resp = fbHttp.getString();
  fbHttp.end();
  if (code <= 0) fbClient.stop();
  return code;
}

// Catat hasil request, cetak ke Serial hanya saat status berubah
void fbNote(int code) {
  int st = (code >= 200 && code < 300) ? 1 : 2;
  if (st != fbState) {
    if (st == 1) Serial.println("[Firebase] tersambung");
    else if (code == 401 || code == 403) Serial.printf("[Firebase] GAGAL (kode %d): izin ditolak, cek FB_AUTH / rules\n", code);
    else if (code < 0) Serial.printf("[Firebase] GAGAL (kode %d): koneksi gagal, cek internet / FB_HOST\n", code);
    else Serial.printf("[Firebase] GAGAL (kode %d)\n", code);
    fbState = st;
  }
}

// Ambil nilai sederhana dari JSON datar, contoh: "mode":"auto" atau "id":3
bool jsonVal(const String& j, const char* key, String& out) {
  String k = String("\"") + key + "\"";
  int p = j.indexOf(k);
  if (p < 0) return false;
  p = j.indexOf(':', p + k.length());
  if (p < 0) return false;
  p++;
  int len = j.length();
  while (p < len && j[p] == ' ') p++;
  if (p >= len) return false;
  if (j[p] == '"') {
    int e = j.indexOf('"', p + 1);
    if (e < 0) return false;
    out = j.substring(p + 1, e);
  } else {
    int e = p;
    while (e < len && j[e] != ',' && j[e] != '}') e++;
    out = j.substring(p, e);
    out.trim();
  }
  return true;
}

void fbSetPending(const char* mode, const char* cmd) {
  xSemaphoreTake(fbMutex, portMAX_DELAY);
  if (mode) { strncpy(pendMode, mode, sizeof(pendMode) - 1); pendMode[sizeof(pendMode) - 1] = '\0'; }
  if (cmd)  { strncpy(pendCmd, cmd, sizeof(pendCmd) - 1);    pendCmd[sizeof(pendCmd) - 1] = '\0'; }
  fbHasPending = true;
  xSemaphoreGive(fbMutex);
}

void fbTask(void* arg) {
  fbClient.setInsecure();            // tanpa verifikasi sertifikat (cukup untuk proyek ini)
  unsigned long tPush = 0, tPoll = 0;
  String lastMode = "";
  long lastId = -1;

  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(200));
    if (WiFi.status() != WL_CONNECTED) continue;
    unsigned long now = millis();

    // 1) Riwayat siram (prioritas): kirim sampai antrean kosong
    Hist h;
    while (xQueuePeek(histQ, &h, 0) == pdTRUE) {
      char body[256];
      snprintf(body, sizeof(body),
        "{\"waktu\":\"%s\",\"durasi_detik\":%.1f,\"mode\":\"%s\",\"tanah_awal\":%.0f,"
        "\"suhu\":%.1f,\"alasan\":\"%s\",\"ts\":{\".sv\":\"timestamp\"}}",
        h.waktu, h.durasi, h.manual ? "manual" : "otomatis", h.tanahAwal, h.suhu, h.alasan);
      int code = fbRequest("POST", "/riwayat", String(body), nullptr);
      fbNote(code);
      if (code >= 200 && code < 300) xQueueReceive(histQ, &h, 0);
      else break;
    }

    // 2) Baca perintah dari web/app
    if (now - tPoll >= FB_POLL_MS) {
      tPoll = now;
      String resp;
      int code = fbRequest("GET", "/kontrol", "", &resp);
      fbNote(code);
      if (code == 200) {
        if (resp == "null") {
          // node belum ada: buat nilai awal
          fbNote(fbRequest("PUT", "/kontrol", "{\"mode\":\"auto\",\"aksi\":\"\",\"detik\":0,\"id\":0}", nullptr));
        } else {
          String mode, aksi, sid, sdet;
          jsonVal(resp, "mode", mode);
          jsonVal(resp, "aksi", aksi);
          jsonVal(resp, "id", sid);
          jsonVal(resp, "detik", sdet);
          long id = sid.toInt();

          // Mode: diterapkan saat berubah di Firebase (dan sekali saat boot)
          if ((mode == "auto" || mode == "manual") && mode != lastMode) {
            lastMode = mode;
            fbSetPending(mode.c_str(), nullptr);
          }
          // Aksi: dijalankan sekali tiap "id" berubah (id awal saat boot diabaikan)
          if (lastId < 0) {
            lastId = id;
          } else if (id != lastId) {
            lastId = id;
            char cmd[24] = "";
            if (aksi == "on")         snprintf(cmd, sizeof(cmd), "on");
            else if (aksi == "off")   snprintf(cmd, sizeof(cmd), "off");
            else if (aksi == "reset") snprintf(cmd, sizeof(cmd), "reset");
            else if (aksi == "siram") snprintf(cmd, sizeof(cmd), "siram %.1f", sdet.toFloat());
            if (cmd[0]) fbSetPending(nullptr, cmd);
          }
        }
      }
    }

    // 3) Kirim status terbaru
    if (fbPushNow || now - tPush >= FB_PUSH_MS) {
      Snap s;
      xSemaphoreTake(fbMutex, portMAX_DELAY);
      s = snap;
      xSemaphoreGive(fbMutex);
      if (s.valid) {
        fbPushNow = false;
        tPush = now;
        char body[900];
        snprintf(body, sizeof(body),
          "{\"tanah\":{\"s1\":{\"raw\":%d,\"pct\":%.0f},\"s2\":{\"raw\":%d,\"pct\":%.0f},"
          "\"s3\":{\"raw\":%d,\"pct\":%.0f},\"rata\":%.1f,\"kategori\":\"%s\"},"
          "\"udara\":{\"suhu\":%.1f,\"rh\":%.0f,\"dht_ok\":%s},"
          "\"fuzzy_detik\":%.2f,\"mode\":\"%s\",\"pompa\":%s,\"cooldown_detik\":%ld,"
          "\"siram_terakhir\":\"%s\",\"waktu\":\"%s\",\"wifi_rssi\":%d,\"uptime_s\":%lu,"
          "\"ts\":{\".sv\":\"timestamp\"}}",
          s.raw[0], s.pct[0], s.raw[1], s.pct[1], s.raw[2], s.pct[2], s.avg, s.kat,
          s.t, s.h, s.dhtOk ? "true" : "false",
          s.fuzzy, s.manual ? "manual" : "auto", s.pumpOn ? "true" : "false", s.cd,
          s.last, s.now, WiFi.RSSI(), now / 1000UL);
        fbNote(fbRequest("PUT", "/status", String(body), nullptr));
      }
    }

    if (fbState == 2) vTaskDelay(pdMS_TO_TICKS(3000));   // jeda saat gagal
  }
}

// ======================= ALARM BUZZER =======================
void sensorAlarmTask(unsigned long now) {
  // --- Tanah kering (histeresis 30% -> 35%) ---
  if (!semuaLepas) {
    if (!keringAktif && soilAvg < 30) {
      keringAktif = true; tKeringBeep = now; buzz(P_KERING);
    } else if (keringAktif && soilAvg > 35) {
      keringAktif = false;
    } else if (keringAktif && now - tKeringBeep >= KERING_ULANG_MS) {
      tKeringBeep = now; buzz(P_KERING);
    }
  }
  // --- Sensor error: tanah lepas atau DHT error ---
  bool err = semuaLepas || !dhtValid;
  if (err && !errAktif) {
    errAktif = true; tErrBeep = now; buzz(P_ERROR);
  } else if (!err) {
    errAktif = false;
  } else if (now - tErrBeep >= ERROR_ULANG_MS) {
    tErrBeep = now; buzz(P_ERROR);
  }
}

// ======================= LCD =======================
void updateLcd() {
  char t0[24], l0[24], l1[24];
  static uint8_t n = 0;
  n++;
  bool layarUdara = ((n / 2) % 2 == 1);
  if (!dhtValid) {
    snprintf(t0, sizeof(t0), "Tnh:%2d%% DHT ERROR", (int)min(soilAvg, 99.0f));
  } else if (layarUdara) {
    snprintf(t0, sizeof(t0), "Udara:%2d%% T:%2dC", (int)min(humAir, 99.0f), (int)tempC);
  } else {
    snprintf(t0, sizeof(t0), "Tnh:%2d%% Suhu:%2dC", (int)min(soilAvg, 99.0f), (int)tempC);
  }
  snprintf(l0, sizeof(l0), "%-16s", t0);
  snprintf(l1, sizeof(l1), "%-6s %c Pmp:%-3s", kategori, modeManual ? 'M' : 'A', pumpOn ? "ON" : "OFF");
  lcd.setCursor(0, 0); lcd.print(l0);
  lcd.setCursor(0, 1); lcd.print(l1);
}

// ======================= SERIAL: STATUS & PERINTAH =======================
long cooldownSisaDetik() {
  if (!hasWatered) return 0;
  unsigned long el = millis() - lastWaterEnd;
  return (el >= COOLDOWN_MS) ? 0 : (COOLDOWN_MS - el) / 1000UL;
}

void printStatus() {
  Serial.println("----------------- STATUS -----------------");
  Serial.printf("Waktu (RTC)     : %s\n", nowStr());
  for (int i = 0; i < 3; i++)
    Serial.printf("S%d: raw=%d  (%.0f%%)\n", i + 1, rawSoil[i], pctSoil[i]);
  if (semuaLepas) Serial.println("Tanah rata-rata : - (SEMUA SENSOR LEPAS/DI UDARA, pompa tidak akan menyala)");
  else            Serial.printf("Tanah rata-rata : %.0f%%  -> %s\n", soilAvg, kategori);
  Serial.printf("DHT11           : T=%.1f C  RH=%.0f%%  (%s)\n", tempC, humAir, dhtValid ? "ok" : "ERROR");
  Serial.printf("Fuzzy           : %.2f detik\n", fuzzySec);
  Serial.printf("Mode            : %s\n", modeManual ? "MANUAL" : "OTOMATIS");
  Serial.printf("Pompa           : %s\n", pumpOn ? "ON" : "OFF");
  Serial.printf("Siram terakhir  : %s\n", lastWaterStr);
  Serial.printf("Sisa cooldown   : %ld detik\n", cooldownSisaDetik());
  if (!WIFI_AKTIF) Serial.println("WiFi            : nonaktif");
  else Serial.printf("WiFi            : %s\n", WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : "tidak tersambung");
  if (!FIREBASE_AKTIF) Serial.println("Firebase        : nonaktif");
  else Serial.printf("Firebase        : %s\n", fbState == 1 ? "tersambung" : (fbState == 2 ? "GAGAL" : "belum ada data"));
  Serial.printf("Buzzer          : %s\n", muted ? "DIBISUKAN" : "aktif");
  Serial.println("------------------------------------------");
}

void printHelp() {
  Serial.println("=========== PERINTAH (ketik lalu Enter) ===========");
  Serial.println("help           : tampilkan menu ini");
  Serial.println("status  (s)    : cetak status lengkap sekali");
  Serial.println("log            : nyalakan/matikan log otomatis tiap 2 detik");
  Serial.println("auto    (a)    : mode otomatis (fuzzy)");
  Serial.println("manual  (m)    : mode manual (pompa hanya dari perintah)");
  Serial.println("on             : pompa ON (maks 15 detik, pindah ke manual)");
  Serial.println("off            : pompa OFF");
  Serial.println("siram <detik>  : siram sekian detik, contoh: siram 5 (maks 15)");
  Serial.println("reset   (r)    : hapus cooldown (untuk uji)");
  Serial.println("waktu          : tampilkan waktu RTC");
  Serial.println("setwaktu <YYYY-MM-DD HH:MM:SS> : atur RTC");
  Serial.println("fuzzy <tanah%> <suhu> : simulasi fuzzy, contoh: fuzzy 20 33");
  Serial.println("bisu           : bisukan / aktifkan lagi buzzer");
  Serial.println("bip <nama>     : tes bunyi: boot, wifi, putus, kering, pompa, error");
  Serial.println("===================================================");
}

void runCommand(String c) {
  c.trim();
  c.toLowerCase();

  if (c == "help" || c == "h" || c == "?") {
    printHelp();
  } else if (c == "status" || c == "s") {
    printStatus();
  } else if (c == "log") {
    logOn = !logOn;
    Serial.printf("Log otomatis: %s\n", logOn ? "ON" : "OFF");
  } else if (c == "auto" || c == "a") {
    modeManual = false;
    if (pumpOn && pumpManual) pumpStop("beralih ke auto");
    Serial.println("Mode: OTOMATIS");
    fbUpdateSnap(); fbPushNow = true;
  } else if (c == "manual" || c == "m") {
    modeManual = true;
    Serial.println("Mode: MANUAL");
    fbUpdateSnap(); fbPushNow = true;
  } else if (c == "on") {
    if (!modeManual) { modeManual = true; Serial.println("Mode: MANUAL"); }
    if (pumpOn) Serial.println("Pompa sudah ON");
    else pumpStartFor(MANUAL_MAX_MS, true);
  } else if (c == "off") {
    if (pumpOn) pumpStop("perintah off");
    else Serial.println("Pompa sudah OFF");
  } else if (c.startsWith("siram")) {
    float sec = c.substring(5).toFloat();
    if (sec <= 0) { Serial.println("Format: siram <detik>, contoh: siram 5"); return; }
    if (sec > MANUAL_MAX_MS / 1000.0) sec = MANUAL_MAX_MS / 1000.0;
    if (pumpOn) Serial.println("Pompa sedang ON, ketik off dulu");
    else pumpStartFor((unsigned long)(sec * 1000.0f), true);
  } else if (c == "waktu") {
    Serial.printf("Waktu RTC: %s\n", nowStr());
  } else if (c.startsWith("setwaktu")) {
    int y, mo, d, h, mi, sc;
    if (!rtcOk) {
      Serial.println("RTC tidak terdeteksi");
    } else if (sscanf(c.c_str(), "setwaktu %d-%d-%d %d:%d:%d", &y, &mo, &d, &h, &mi, &sc) == 6) {
      rtc.adjust(DateTime(y, mo, d, h, mi, sc));
      Serial.printf("Waktu diatur: %s\n", nowStr());
    } else {
      Serial.println("Format: setwaktu 2026-11-01 20:15:00");
    }
  } else if (c == "reset" || c == "r") {
    hasWatered = false;
    Serial.println("Cooldown dihapus");
    fbUpdateSnap(); fbPushNow = true;
  } else if (c.startsWith("fuzzy")) {
    float p, t;
    if (sscanf(c.c_str(), "fuzzy %f %f", &p, &t) == 2) {
      Serial.printf("Simulasi: tanah=%.0f%% (%s), suhu=%.1f C -> %.2f detik\n",
                    p, soilCategory(p), t, fuzzySugeno(p, t));
    } else {
      Serial.println("Format: fuzzy <tanah%> <suhu>, contoh: fuzzy 20 33");
    }
  } else if (c == "bisu") {
    muted = !muted;
    Serial.printf("Buzzer: %s\n", muted ? "DIBISUKAN" : "aktif");
  } else if (c.startsWith("bip")) {
    String nm = c.substring(3);
    nm.trim();
    int id = -1;
    if (nm == "boot") id = P_BOOT;
    else if (nm == "wifi") id = P_WIFI_OK;
    else if (nm == "putus") id = P_WIFI_PUTUS;
    else if (nm == "kering") id = P_KERING;
    else if (nm == "pompa") id = P_POMPA;
    else if (nm == "error") id = P_ERROR;
    if (id < 0) Serial.println("Nama: boot, wifi, putus, kering, pompa, error");
    else if (muted) Serial.println("Buzzer sedang dibisukan (ketik bisu)");
    else { buzz(id); Serial.printf("Bunyi: %s\n", nm.c_str()); }
  } else {
    Serial.printf("Perintah tidak dikenal: \"%s\" (ketik help)\n", c.c_str());
  }
}

void handleSerial() {
  while (Serial.available()) {
    char ch = Serial.read();
    if (ch == '\r') continue;
    if (ch == '\n') {
      if (cmdBuf.length() > 0) runCommand(cmdBuf);
      cmdBuf = "";
    } else if (cmdBuf.length() < 40) {
      cmdBuf += ch;
    }
  }
}

// ======================= SETUP =======================
void setup() {
  // Relay dan buzzer dimatikan dulu sebelum pin dijadikan output (hindari kedip/bunyi saat boot)
  digitalWrite(PIN_RELAY, RELAY_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_RELAY, OUTPUT);
  relayWrite(false);
  digitalWrite(PIN_BUZZER, BUZZER_ACTIVE_LOW ? HIGH : LOW);
  pinMode(PIN_BUZZER, OUTPUT);
  buzzWrite(false);

  fbMutex = xSemaphoreCreateMutex();
  histQ   = xQueueCreate(10, sizeof(Hist));

  Serial.begin(115200);
  analogReadResolution(12);
  for (int i = 0; i < 3; i++) analogSetPinAttenuation(PIN_SOIL[i], ADC_11db);

  Wire.begin(21, 22);
  lcd.init(); lcd.backlight();
  lcd.setCursor(0, 0); lcd.print("Smart Irrigation");
  lcd.setCursor(0, 1); lcd.print("Firebase v4");

  dht.begin();

  rtcOk = rtc.begin();
  if (!rtcOk) {
    Serial.println("PERINGATAN: RTC tidak terdeteksi (cek SDA/SCL dan VCC 5V)");
  } else if (!rtc.isrunning()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
    Serial.println("RTC belum berjalan, diisi waktu kompilasi. Koreksi dengan: setwaktu YYYY-MM-DD HH:MM:SS");
  } else {
    Serial.printf("RTC OK: %s\n", nowStr());
  }

  if (WIFI_AKTIF) {                 // tidak menunggu; koneksi dipantau di loop
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    tWifiRetry = millis();
  }

  delay(2000);                      // DHT11 butuh waktu awal
  readSensors();
  fuzzySec = semuaLepas ? 0 : fuzzySugeno(soilAvg, tempC);
  lcd.clear();

  if (FIREBASE_AKTIF && WIFI_AKTIF) {
    fbUpdateSnap();
    xTaskCreatePinnedToCore(fbTask, "firebase", 16384, NULL, 1, NULL, 0);
  }

  Serial.println();
  Serial.println("Smart Irrigation - v4 (Firebase)");
  printHelp();
  buzz(P_BOOT);
}

// ======================= LOOP =======================
void loop() {
  unsigned long now = millis();

  handleSerial();
  fbApplyPending();
  buzzUpdate();

  // Pengaman pompa: selalu dicek paling awal
  if (pumpOn && (now - pumpStart >= pumpDurMs)) pumpStop("durasi selesai");

  if (WIFI_AKTIF) wifiTask(now);

  if (now - tSense >= SENSE_MS) {
    tSense = now;
    readSensors();
    fuzzySec = semuaLepas ? 0 : fuzzySugeno(soilAvg, tempC);

    if (logOn) {
      Serial.printf("[%s] S1=%d(%.0f%%) S2=%d(%.0f%%) S3=%d(%.0f%%) | rata=%.0f%% %s | T=%.1fC RH=%.0f%% DHT=%s | fuzzy=%.2fs | pompa=%s mode=%s cd=%lds\n",
        nowStr(), rawSoil[0], pctSoil[0], rawSoil[1], pctSoil[1], rawSoil[2], pctSoil[2],
        soilAvg, kategori, tempC, humAir, dhtValid ? "ok" : "ERR", fuzzySec,
        pumpOn ? "ON" : "OFF", modeManual ? "manual" : "auto", cooldownSisaDetik());
    }

    // Keputusan otomatis
    if (!modeManual && !pumpOn && cooldownSisaDetik() == 0 && fuzzySec >= MIN_DURATION_S) {
      unsigned long ms = (unsigned long)(fuzzySec * 1000.0f);
      if (ms > MAX_PUMP_MS) ms = MAX_PUMP_MS;
      pumpStartFor(ms, false);
    }

    sensorAlarmTask(now);
    updateLcd();
    fbUpdateSnap();
  }
}