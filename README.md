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
| SMS | Send, Send OTP, Get Balance, Get Status (kampanya ID veya Custom ID ile), Get Many Inbound Messages, Get Many Sender IDs |
| Switch | Originate Call, Get Many Call Records |
| WhatsApp | Send OTP, Send Utility Message, Send Bulk Message (en fazla 10.000 alıcı), Get Message, Get Many Messages |
| Her ürün | Advanced: Raw Request — ürünün 72 operasyonundan herhangi birini doğrudan çağırır |

"Get Many" eylemleri **Return All** veya **Limit** seçeneği sunar ve Verimor sonuçlarını sizin yerinize sayfalar; her kayıt ayrı bir item olur. Diğer n8n node'ları gibi eylem her giriş item'ı için bir kez çalışır; birden fazla item üreten bir node'dan sonra liste eylemi kullanıyorsanız node ayarlarında **Execute Once**'ı açın.

Node, n8n'in AI Agent'ı tarafından araç olarak da kullanılabilir (self-hosted n8n'de `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`).

## Credentials

Her ürünün ayrı credential'ı vardır:

- **Verimor SMS API**: kullanıcı adı, şifre, isteğe bağlı varsayılan gönderici (`source_addr`), base URL. Test: bakiye sorgusu.
- **Verimor Switch API**: API anahtarı, base URL. Test: kuyruk listesi.
- **Verimor WhatsApp API**: API anahtarı (`x-api-key`), base URL. Test yalnız erişilebilirliği kontrol eder; WhatsApp'ta yan etkisiz kimlik doğrulayan bir uç yoktur.

Base URL varsayılan olarak Verimor'un adresidir (SMS `https://sms.verimor.com.tr`, Switch `https://api.bulutsantralim.com`, WhatsApp `https://wapi.verimor.com.tr`). İstekleri başka bir sunucuya, örneğin kendi proxy'nize veya bir test sunucusuna göndermek için değiştirebilirsiniz. Mutlak bir `http://` veya `https://` adresi girin; IP, port ve `http://10.0.0.5:8080/verimor` gibi bir alt yol korunur.

## Örnek workflow'lar

[`examples/`](examples/) altında içe aktarılabilir workflow'lar var: her eylem için bir tane ([`examples/actions/`](examples/actions/)) ve 72 operasyonun her biri için bir Raw Request ([`examples/raw/`](examples/raw/)). n8n'de **Import from File** ile açın, ardından Verimor düğümünde kendi credential'ınızı seçin. `test/examples.test.js` her birini mock ile çalıştırıp gönderdiği isteği doğrular.

Yapay zekâ asistanları için tek dosyalık başvuru: [`llms.md`](llms.md).

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
