# Verimor n8n node

[English](README.en.md)

Verimor SMS, Switch ve WhatsApp API'leri için bağımsız topluluk n8n node'u (`n8n-nodes-verimor`).

> Bu proje topluluk tarafından sürdürülür ve resmî değildir. Verimor adına destek veya uyumluluk garantisi vermez.
>
> Bu sürüm offline testlerle doğrulanmıştır; canlı Verimor servisine karşı henüz doğrulanmamıştır.

## Kurulum

n8n'de **Settings → Community Nodes → Install** ile `n8n-nodes-verimor` paketini kurun. Paket npm'de yayımlanana kadar GitHub Release'teki `.tgz` dosyasını kendi barındırdığınız n8n'in `~/.n8n/nodes` dizinine `npm install <dosya>.tgz` ile kurabilirsiniz.

## Eylemler

| Kaynak | Eylem |
| --- | --- |
| SMS | Send, Get Balance, Get Status (kampanya ID veya Custom ID ile) |
| Switch | Originate Call |
| WhatsApp | Send OTP, Send Utility Message |
| Her ürün | Advanced: Raw Request — ürünün 68 operasyonundan herhangi birini doğrudan çağırır |

## Credentials

Her ürünün ayrı credential'ı vardır:

- **Verimor SMS API**: kullanıcı adı, şifre, isteğe bağlı varsayılan gönderici (`source_addr`), base URL. Test: bakiye sorgusu.
- **Verimor Switch API**: API anahtarı, base URL. Test: kuyruk listesi.
- **Verimor WhatsApp API**: API anahtarı (`x-api-key`), base URL. Test yalnız erişilebilirliği kontrol eder; WhatsApp'ta yan etkisiz kimlik doğrulayan bir uç yoktur.

Base URL'yi yalnız test sunucusuna yönlendirmek için değiştirin.

## Güvenlik ve maliyet

- Gönderim eylemleri gerçek mesaj veya arama üretir ve ücretli olabilir. n8n'in **Retry On Fail** ayarı kapalıyken node hiçbir isteği tekrarlamaz; açarsanız aynı mesaj birden fazla gidebilir.
- İstekler 30 saniyede zaman aşımına uğrar.
- Hata mesajları yalnız HTTP durumunu ve yanıt özetini içerir; kimlik bilgisi veya istek adresi içermez.
- Advanced: Raw Request tam olarak tarif ettiğiniz isteği gönderir.

## Geliştirme

```bash
npm ci
npm run lint
npm test
sh scripts/test-consumer.sh
```

`nodes/Verimor/operations.gen.ts` üretilmiş bir dosyadır; elle değiştirmeyin.

## Lisans

MIT. Bkz. [LICENSE](LICENSE).
