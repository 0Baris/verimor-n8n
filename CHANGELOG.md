# Değişiklik günlüğü / Changelog

## 0.2.1

- Credential'lardaki Base URL açıklaması netleşti: varsayılan Verimor'un adresidir; kendi sunucunuz veya proxy için değiştirilebilir, IP, port ve alt yol korunur (testle doğrulandı).
- The credentials' Base URL description is clearer: Verimor's address is the default and can be changed to your own server or proxy; an IP, a port and a path prefix are kept (now tested).

## 0.2.0

- Yeni eylemler: SMS Send OTP, Get Many Inbound Messages, Get Many Sender IDs; Switch Get Many Call Records; WhatsApp Send Bulk Message, Get Message, Get Many Messages.
- "Get Many" eylemleri Return All / Limit ile sayfalamayı kendisi yapar ve her kaydı ayrı item olarak döndürür.
- Raw istek artık Verimor'un yeni operasyonları dahil 72 operasyonu kapsar.
- Gerçek bir n8n (2.41.5) içinde loopback mock'a karşı çalışan uçtan uca test CI'a eklendi; metin yanıtlar artık sayıya çevrilmez (ör. `"42.50"`).

- New actions: SMS Send OTP, Get Many Inbound Messages, Get Many Sender IDs; Switch Get Many Call Records; WhatsApp Send Bulk Message, Get Message, Get Many Messages.
- "Get Many" actions page through results with Return All / Limit and return one item per record.
- The raw request covers all 72 operations, including Verimor's new ones.
- An end-to-end test inside a real n8n (2.41.5) against a loopback mock runs in CI; text responses are no longer parsed as numbers (for example `"42.50"`).

## 0.1.0 - Yayın adayı / Release candidate

- SMS gönderme, bakiye ve durum; Switch arama başlatma; WhatsApp OTP ve utility mesajı; her ürün için gelişmiş raw istek (68 operasyon).
- Ürün başına ayrı credential, tekrar denemesiz istekler, 30 saniyelik zaman aşımı, sır içermeyen hata mesajları.
- Offline testler ve paketlenmiş tarball ile temiz kurulum testi.

Canlı Verimor servisi doğrulaması, npm yayını ve n8n doğrulama başvurusu henüz yapılmamıştır.

- SMS send, balance and status; Switch originate; WhatsApp OTP and utility messages; an advanced raw request for every product (68 operations).
- Separate credentials per product, no retries, a 30-second timeout, error messages without secrets.
- Offline tests and a clean install test from the packed tarball.

Live Verimor validation, npm publication and n8n verification have not been done yet.
