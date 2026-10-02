# n8n-nodes-verimor — reference for AI assistants

Unofficial n8n community node for Verimor SMS, Switch and WhatsApp. One node, `Verimor`,
with a `resource` (`sms`, `switch`, `whatsapp`) and an `operation`.

Install from **Settings → Community Nodes** with `n8n-nodes-verimor`, or, for self-hosted
n8n, install the `.tgz` from the GitHub Release into `~/.n8n/nodes`.

## Credentials

| Credential type | Fields | Default base URL |
| --- | --- | --- |
| `verimorSmsApi` | `username`, `password`, `defaultSender`, `baseUrl` | `https://sms.verimor.com.tr` |
| `verimorSwitchApi` | `apiKey`, `baseUrl` | `https://api.bulutsantralim.com` |
| `verimorWhatsAppApi` | `apiKey`, `baseUrl` | `https://wapi.verimor.com.tr` |

Leave `baseUrl` empty to use Verimor's server, or set it to a proxy or test server.

## Example workflows

Every file under `examples/` is an importable workflow (**Import from File** in n8n): a
manual trigger followed by one Verimor node. After importing, choose your own credential on
the Verimor node. `test/examples.test.js` runs each one through the node with a mock and
checks the request it sends.

## Errors

A non-2xx answer fails the node with a `NodeApiError` that carries the status code and the
response body, without credentials. With **Continue On Fail** the error becomes an item.

## Actions

| Resource | Operation | Request | Example |
| --- | --- | --- | --- |
| `sms` | `getBalance` (Get Balance) | `GET /v2/balance` | [`examples/actions/sms-getBalance.json`](examples/actions/sms-getBalance.json) |
| `sms` | `getInboundMessages` (Get Many Inbound Messages) | `GET /v2/inbound_messages` | [`examples/actions/sms-getInboundMessages.json`](examples/actions/sms-getInboundMessages.json) |
| `sms` | `getSenderIds` (Get Many Sender IDs) | `GET /v2/headers` | [`examples/actions/sms-getSenderIds.json`](examples/actions/sms-getSenderIds.json) |
| `sms` | `getStatus` (Get Status) | `GET /v2/status` | [`examples/actions/sms-getStatus.json`](examples/actions/sms-getStatus.json) |
| `sms` | `send` (Send) | `POST /v2/send.json` | [`examples/actions/sms-send.json`](examples/actions/sms-send.json) |
| `sms` | `sendOtp` (Send OTP) | `POST /v2/otp` | [`examples/actions/sms-sendOtp.json`](examples/actions/sms-sendOtp.json) |
| `switch` | `getCallRecords` (Get Many Call Records) | `GET /cdrs` | [`examples/actions/switch-getCallRecords.json`](examples/actions/switch-getCallRecords.json) |
| `switch` | `originate` (Originate Call) | `POST /originate` | [`examples/actions/switch-originate.json`](examples/actions/switch-originate.json) |
| `whatsapp` | `getMessages` (Get Many Messages) | `GET /v1/messages` | [`examples/actions/whatsapp-getMessages.json`](examples/actions/whatsapp-getMessages.json) |
| `whatsapp` | `getMessage` (Get Message) | `GET /v1/messages/{id}` | [`examples/actions/whatsapp-getMessage.json`](examples/actions/whatsapp-getMessage.json) |
| `whatsapp` | `sendBulk` (Send Bulk Message) | `POST /v1/messages/bulk` | [`examples/actions/whatsapp-sendBulk.json`](examples/actions/whatsapp-sendBulk.json) |
| `whatsapp` | `sendOtp` (Send OTP) | `POST /v1/messages/otp` | [`examples/actions/whatsapp-sendOtp.json`](examples/actions/whatsapp-sendOtp.json) |
| `whatsapp` | `sendUtility` (Send Utility Message) | `POST /v1/messages/utility` | [`examples/actions/whatsapp-sendUtility.json`](examples/actions/whatsapp-sendUtility.json) |

## Raw requests

`operation: rawRequest` sends any documented operation: `operationId` picks it, and
`pathParameters`, `queryParameters` and `body` are JSON strings. The node adds the
credentials. Every operation has a raw example workflow:

### SMS

- `POST /v2/blacklists` — Kara Liste Ekleme: [`examples/raw/sms/post_v2_blacklists.json`](examples/raw/sms/post_v2_blacklists.json) `operationId=post_v2_blacklists` path `{}` query `{"phones": "905001112233"}` body `{}`
- `GET /v2/balance` — Bakiye Sorgulama: [`examples/raw/sms/get_v2_balance.json`](examples/raw/sms/get_v2_balance.json) `operationId=get_v2_balance` path `{}` query `{}` body `{}`
- `POST /v2/cancel/{id}` — Gönderim İptali: [`examples/raw/sms/post_v2_cancel_id.json`](examples/raw/sms/post_v2_cancel_id.json) `operationId=post_v2_cancel_id` path `{"id": "123"}` query `{}` body `{}`
- `DELETE /v2/blacklists/{id}` — Kara Listeden Silme: [`examples/raw/sms/delete_v2_blacklists_id.json`](examples/raw/sms/delete_v2_blacklists_id.json) `operationId=delete_v2_blacklists_id` path `{"id": "123"}` query `{}` body `{}`
- `GET /v2/blacklists` — Kara Liste Görüntüleme: [`examples/raw/sms/get_v2_blacklists.json`](examples/raw/sms/get_v2_blacklists.json) `operationId=get_v2_blacklists` path `{}` query `{}` body `{}`
- `GET /v2/inbound_messages` — Gelen SMS Sorgulama: [`examples/raw/sms/get_v2_inbound_messages.json`](examples/raw/sms/get_v2_inbound_messages.json) `operationId=get_v2_inbound_messages` path `{}` query `{}` body `{}`
- `GET /v2/iys/campaigns/{id}/consents` — İYS İzinleri Sorgulama: [`examples/raw/sms/get_v2_iys_campaigns_id_consents.json`](examples/raw/sms/get_v2_iys_campaigns_id_consents.json) `operationId=get_v2_iys_campaigns_id_consents` path `{"id": 1}` query `{}` body `{}`
- `GET /v2/iys/campaigns` — İYS Kampanyaları Listeleme: [`examples/raw/sms/get_v2_iys_campaigns.json`](examples/raw/sms/get_v2_iys_campaigns.json) `operationId=get_v2_iys_campaigns` path `{}` query `{}` body `{}`
- `GET /v2/headers` — Başlık Yönetimi: [`examples/raw/sms/get_v2_headers.json`](examples/raw/sms/get_v2_headers.json) `operationId=get_v2_headers` path `{}` query `{}` body `{}`
- `POST /v2/send.json` — SMS Gönderme (JSON): [`examples/raw/sms/sendSmsJson.json`](examples/raw/sms/sendSmsJson.json) `operationId=sendSmsJson` path `{}` query `{}` body `{"messages": [{"dest": "905111111111,905111111112", "msg": "Deneme Mesaj"}]}`
- `GET /v2/send` — SMS Gönderme (GET): [`examples/raw/sms/get_v2_send.json`](examples/raw/sms/get_v2_send.json) `operationId=get_v2_send` path `{}` query `{"dest": "905001112233", "msg": "Merhaba"}` body `{}`
- `POST /v2/otp` — OTP Gönderme: [`examples/raw/sms/sendOtp.json`](examples/raw/sms/sendOtp.json) `operationId=sendOtp` path `{}` query `{}` body `{"dest": "905001234567", "code": "482931"}`
- `GET /v2/status` — Rapor Sorgulama (API ID): [`examples/raw/sms/getSmsStatus.json`](examples/raw/sms/getSmsStatus.json) `operationId=getSmsStatus` path `{}` query `{"id": 1}` body `{}`
- `POST /v2/iys_consents.json` — İzin Yönetimi: [`examples/raw/sms/post_v2_iys_consents_json.json`](examples/raw/sms/post_v2_iys_consents_json.json) `operationId=post_v2_iys_consents_json` path `{}` query `{}` body `{"consents": [{"type": "MESAJ", "source": "HS_WEB", "status": "ONAY", "recipient_type": "BIREYSEL", "consent_date": "2022-04-14 13:30:30", "recipient": "905001112233"}]}`

### Switch

- `POST /answer` — Çağrıyı Cevaplama (POST): [`examples/raw/switch/answerCallPost.json`](examples/raw/switch/answerCallPost.json) `operationId=answerCallPost` path `{}` query `{}` body `{"id": "736eaf7e-4cc4-44ab-8dbe-16b18e9618b1"}`
- `GET /answer/{id}` — Çağrıyı Cevaplama (GET): [`examples/raw/switch/answerCall.json`](examples/raw/switch/answerCall.json) `operationId=answerCall` path `{"id": "736eaf7e-4cc4-44ab-8dbe-16b18e9618b1"}` query `{}` body `{}`
- `GET /bridge` — Çağrı Bağlama: [`examples/raw/switch/createBridge.json`](examples/raw/switch/createBridge.json) `operationId=createBridge` path `{}` query `{"source": "905111111111", "destination": "905111111112"}` body `{}`
- `POST /announcements` — Yeni Ses Dosyası Yükleme: [`examples/raw/switch/createAnnouncement.json`](examples/raw/switch/createAnnouncement.json) `operationId=createAnnouncement` path `{}` query `{}` body `{"name": "dosya adı", "sounddata": "base64"}`
- `POST /blocked_numbers` — Kara Listeye Ekleme: [`examples/raw/switch/createBlockedNumber.json`](examples/raw/switch/createBlockedNumber.json) `operationId=createBlockedNumber` path `{}` query `{"number": "05111111111"}` body `{}`
- `POST /contacts` — Kişi Ekleme: [`examples/raw/switch/createContact.json`](examples/raw/switch/createContact.json) `operationId=createContact` path `{}` query `{"name": "Verimor", "surname": "Telekomünikasyon", "phone": "05111111111"}` body `{}`
- `POST /contact_groups` — Grup Oluşturma: [`examples/raw/switch/createContactGroup.json`](examples/raw/switch/createContactGroup.json) `operationId=createContactGroup` path `{}` query `{"name": "Müşteriler"}` body `{}`
- `POST /fax_document_url` — Faks Belgesi URL'si İsteme: [`examples/raw/switch/createFaxDocumentUrl.json`](examples/raw/switch/createFaxDocumentUrl.json) `operationId=createFaxDocumentUrl` path `{}` query `{"call_uuid": "e28e5d48-05d8-11e8-663a-fde60c59425c"}` body `{}`
- `POST /fax_orders` — Faks Gönderimi: [`examples/raw/switch/createFaxOrder.json`](examples/raw/switch/createFaxOrder.json) `operationId=createFaxOrder` path `{}` query `{"remote_station_id": "901234567891", "filedata": "JVBERi0xLjQK"}` body `{}`
- `POST /ivr_campaigns.json` — Otomatik Arama Kampanyası Oluşturma: [`examples/raw/switch/createIvrCampaign.json`](examples/raw/switch/createIvrCampaign.json) `operationId=createIvrCampaign` path `{}` query `{}` body `{"call_type": "ivr", "name": "Memnuniyet anketi", "phone_list": [{"phone": "05111111111", "phrase": "#429 12/05/2017 #430 102.45 #431", "lang": "tr-TR"}, {"phone": "05111111112", "phrase": "#429 12/05/2017 #430 65.12 #431", "lang": "tr-TR"}]}`
- `POST /recording_url` — Ses Kaydı için Geçici URL Oluşturma: [`examples/raw/switch/createRecordingUrl.json`](examples/raw/switch/createRecordingUrl.json) `operationId=createRecordingUrl` path `{}` query `{"call_uuid": "3f2504e0-4f89-41d3-9a0c-0305e82c3301"}` body `{}`
- `POST /voicemail_recording_url` — Telesekreter Ses Kaydı için Geçici URL Oluşturma: [`examples/raw/switch/createVoicemailRecordingUrl.json`](examples/raw/switch/createVoicemailRecordingUrl.json) `operationId=createVoicemailRecordingUrl` path `{}` query `{"uuid": "12345678-1234-5678-4321-123456789012"}` body `{}`
- `POST /webphone_tokens` — Dahili için Token Alma (IFrame ile kullanmak için): [`examples/raw/switch/createWebphoneToken.json`](examples/raw/switch/createWebphoneToken.json) `operationId=createWebphoneToken` path `{}` query `{"extension": "1001"}` body `{}`
- `DELETE /announcements/{id}` — Ses Dosyası Silme: [`examples/raw/switch/deleteAnnouncement.json`](examples/raw/switch/deleteAnnouncement.json) `operationId=deleteAnnouncement` path `{"id": "123"}` query `{}` body `{}`
- `DELETE /blocked_numbers/delete` — Kara Listeden Silme: [`examples/raw/switch/deleteBlockedNumber.json`](examples/raw/switch/deleteBlockedNumber.json) `operationId=deleteBlockedNumber` path `{}` query `{"number": "05111111111"}` body `{}`
- `DELETE /contacts/{id}` — Kişi Silme: [`examples/raw/switch/deleteContact.json`](examples/raw/switch/deleteContact.json) `operationId=deleteContact` path `{"id": 1}` query `{}` body `{}`
- `DELETE /contact_groups/{id}` — Grup Silme: [`examples/raw/switch/deleteContactGroup.json`](examples/raw/switch/deleteContactGroup.json) `operationId=deleteContactGroup` path `{"id": 1}` query `{}` body `{}`
- `DELETE /ivr_campaigns/{id}.json` — Otomatik Arama Kampanyasını Silme: [`examples/raw/switch/deleteIvrCampaign.json`](examples/raw/switch/deleteIvrCampaign.json) `operationId=deleteIvrCampaign` path `{"id": "123"}` query `{}` body `{}`
- `GET /fax_document/{id}` — Faks Belgesi İndirme/Görüntüleme: [`examples/raw/switch/downloadFaxDocument.json`](examples/raw/switch/downloadFaxDocument.json) `operationId=downloadFaxDocument` path `{"id": "123"}` query `{}` body `{}`
- `GET /cdrs/{id}` — Belirli Bir Çağrının Detaylı CDR Kaydı: [`examples/raw/switch/getCdr.json`](examples/raw/switch/getCdr.json) `operationId=getCdr` path `{"id": "call-uuid-12345-67890"}` query `{}` body `{}`
- `GET /crm_integrations` — CRM Entegrasyon Ayarlarını Getirme: [`examples/raw/switch/getCrmIntegrations.json`](examples/raw/switch/getCrmIntegrations.json) `operationId=getCrmIntegrations` path `{}` query `{}` body `{}`
- `GET /extensions/{id}` — Dahili Detayı: [`examples/raw/switch/getExtension.json`](examples/raw/switch/getExtension.json) `operationId=getExtension` path `{"id": "1001"}` query `{}` body `{}`
- `GET /webhook-payload-examples` — CRM Webhook Payload Örnekleri: [`examples/raw/switch/webhookPayloadExamples.json`](examples/raw/switch/webhookPayloadExamples.json) `operationId=webhookPayloadExamples` path `{}` query `{}` body `{}`
- `GET /hangup/{id}` — Çağrıyı Sonlandırma: [`examples/raw/switch/hangupCall.json`](examples/raw/switch/hangupCall.json) `operationId=hangupCall` path `{"id": "f3797dfc-a818-11e7-bf70-cb295b6663ce"}` query `{}` body `{}`
- `GET /agent_statuses` — MT Durumlarını ve Üyeliklerini Listeleme: [`examples/raw/switch/listAgentStatuses.json`](examples/raw/switch/listAgentStatuses.json) `operationId=listAgentStatuses` path `{}` query `{}` body `{}`
- `GET /announcements` — Ses Dosyaları Listesine Erişim: [`examples/raw/switch/getAnnouncements.json`](examples/raw/switch/getAnnouncements.json) `operationId=getAnnouncements` path `{}` query `{}` body `{}`
- `GET /blocked_numbers` — Kara Listeye Erişim: [`examples/raw/switch/listBlockedNumbers.json`](examples/raw/switch/listBlockedNumbers.json) `operationId=listBlockedNumbers` path `{}` query `{}` body `{}`
- `GET /caller_ids` — Dış Numaralar Listesine Erişim: [`examples/raw/switch/getCallerIds.json`](examples/raw/switch/getCallerIds.json) `operationId=getCallerIds` path `{}` query `{}` body `{}`
- `GET /cdrs` — Çağrı Detay Kayıtları (CDR) Listesi: [`examples/raw/switch/getCdrs.json`](examples/raw/switch/getCdrs.json) `operationId=getCdrs` path `{}` query `{}` body `{}`
- `GET /contact_groups` — Grup Listesine Erişim: [`examples/raw/switch/listContactGroups.json`](examples/raw/switch/listContactGroups.json) `operationId=listContactGroups` path `{}` query `{}` body `{}`
- `GET /contacts` — Kişiler Listesine Erişim: [`examples/raw/switch/listContacts.json`](examples/raw/switch/listContacts.json) `operationId=listContacts` path `{}` query `{}` body `{}`
- `GET /extensions` — Dahili Listesi: [`examples/raw/switch/listExtensions.json`](examples/raw/switch/listExtensions.json) `operationId=listExtensions` path `{}` query `{}` body `{}`
- `GET /fax_orders` — Tamamlanmamış Faks Gönderimlerinin Listesi: [`examples/raw/switch/listFaxOrders.json`](examples/raw/switch/listFaxOrders.json) `operationId=listFaxOrders` path `{}` query `{}` body `{}`
- `GET /fdrs` — Faks Listesine Erişim: [`examples/raw/switch/listFdrs.json`](examples/raw/switch/listFdrs.json) `operationId=listFdrs` path `{}` query `{}` body `{}`
- `GET /queues/pending` — Kuyrukta Bekleyenler Listesine Erişim: [`examples/raw/switch/getQueuesPending.json`](examples/raw/switch/getQueuesPending.json) `operationId=getQueuesPending` path `{}` query `{}` body `{}`
- `GET /queue/user_list` — Kuyruktaki Dahili Listesine Erişim: [`examples/raw/switch/getQueueUserList.json`](examples/raw/switch/getQueueUserList.json) `operationId=getQueueUserList` path `{}` query `{"queue_number": "200"}` body `{}`
- `GET /queues` — Kuyruklar Listesine Erişim: [`examples/raw/switch/getQueues.json`](examples/raw/switch/getQueues.json) `operationId=getQueues` path `{}` query `{}` body `{}`
- `GET /user_statuses` — Dahili Durumlarını Listeleme: [`examples/raw/switch/listUserStatuses.json`](examples/raw/switch/listUserStatuses.json) `operationId=listUserStatuses` path `{}` query `{}` body `{}`
- `GET /voicemail_messages` — Telesekreter Arama Kayıtlarına Erişim: [`examples/raw/switch/getVoicemailMessages.json`](examples/raw/switch/getVoicemailMessages.json) `operationId=getVoicemailMessages` path `{}` query `{}` body `{}`
- `GET /queue/manage_users` — Kuyruğa Dahili Ekleme, Çıkarma veya Yer Değiştirme: [`examples/raw/switch/manageQueueUsers.json`](examples/raw/switch/manageQueueUsers.json) `operationId=manageQueueUsers` path `{}` query `{"queue_number": "200", "user_list": "1000,1001,1002"}` body `{}`
- `POST /originate` — Çağrı Başlatma (POST): [`examples/raw/switch/originateCallPost.json`](examples/raw/switch/originateCallPost.json) `operationId=originateCallPost` path `{}` query `{}` body `{"extension": "1001", "destination": "908505320000"}`
- `GET /originate` — Çağrı Başlatma (GET): [`examples/raw/switch/originateCall.json`](examples/raw/switch/originateCall.json) `operationId=originateCall` path `{}` query `{"extension": "1001", "destination": "908505320000"}` body `{}`
- `GET /mute/{id}` — Çağrıyı Sessize Alma / Sesli Yapma: [`examples/raw/switch/muteCall.json`](examples/raw/switch/muteCall.json) `operationId=muteCall` path `{"id": "f3797dfc-a818-11e7-bf70-cb295b6663ce"}` query `{"state": "on"}` body `{}`
- `GET /dnd/{id}` — Dahili için Rahatsız Etme (DND) Modunu Ayarlama: [`examples/raw/switch/createDnd.json`](examples/raw/switch/createDnd.json) `operationId=createDnd` path `{"id": "1001"}` query `{"state": "on"}` body `{}`
- `POST /transfer` — Çağrıyı Aktarma (POST): [`examples/raw/switch/transferCallPost.json`](examples/raw/switch/transferCallPost.json) `operationId=transferCallPost` path `{}` query `{"id": "f3797dfc-a818-11e7-bf70-cb295b6663ce", "user_number": "1000"}` body `{}`
- `GET /transfer/{id}` — Çağrıyı Aktarma (GET): [`examples/raw/switch/transferCall.json`](examples/raw/switch/transferCall.json) `operationId=transferCall` path `{"id": "f3797dfc-a818-11e7-bf70-cb295b6663ce"}` query `{"user_number": "1000"}` body `{}`
- `PATCH /announcements/{id}` — Ses Dosyası Güncelleme: [`examples/raw/switch/updateAnnouncement.json`](examples/raw/switch/updateAnnouncement.json) `operationId=updateAnnouncement` path `{"id": "123"}` query `{}` body `{}`
- `PATCH /contacts/{id}` — Kişi Güncelleme: [`examples/raw/switch/updateContact.json`](examples/raw/switch/updateContact.json) `operationId=updateContact` path `{"id": 1}` query `{}` body `{}`
- `PATCH /contact_groups/{id}` — Grup Güncelleme: [`examples/raw/switch/updateContactGroup.json`](examples/raw/switch/updateContactGroup.json) `operationId=updateContactGroup` path `{"id": 1}` query `{"name": "Arkadaşlarım"}` body `{}`
- `POST /crm_integrations` — CRM Entegrasyon Ayarlarını Güncelleme: [`examples/raw/switch/updateCrmIntegrations.json`](examples/raw/switch/updateCrmIntegrations.json) `operationId=updateCrmIntegrations` path `{}` query `{}` body `{}`
- `PATCH /ivr_campaigns/{id}.json` — Otomatik Arama Kampanyasını Başlatma/Durdurma: [`examples/raw/switch/updateIvrCampaign.json`](examples/raw/switch/updateIvrCampaign.json) `operationId=updateIvrCampaign` path `{"id": "123"}` query `{"status": "on"}` body `{}`
- `GET /update_outbound_caller_id` — Dahilinin Dış Numarasını (Arayan No) Değiştirme: [`examples/raw/switch/updateOutboundCallerId.json`](examples/raw/switch/updateOutboundCallerId.json) `operationId=updateOutboundCallerId` path `{}` query `{"extension": "1000", "caller_id": "90850532xxxx"}` body `{}`

### WhatsApp

- `GET /v1/messages/{message_ref}` — Mesaj Kaydını Sorgula: [`examples/raw/whatsapp/get_message_v1_messages__message_ref__get.json`](examples/raw/whatsapp/get_message_v1_messages__message_ref__get.json) `operationId=get_message_v1_messages__message_ref__get` path `{"message_ref": "3f2504e0-4f89-41d3-9a0c-0305e82c3301"}` query `{}` body `{}`
- `GET /health` — Health check: [`examples/raw/whatsapp/health_health_get.json`](examples/raw/whatsapp/health_health_get.json) `operationId=health_health_get` path `{}` query `{}` body `{}`
- `GET /v1/messages` — Mesajları Listele / Ara: [`examples/raw/whatsapp/list_messages_v1_messages_get.json`](examples/raw/whatsapp/list_messages_v1_messages_get.json) `operationId=list_messages_v1_messages_get` path `{}` query `{}` body `{}`
- `POST /v1/messages/bulk` — Toplu Şablon Mesajı Gönder: [`examples/raw/whatsapp/send_bulk_v1_messages_bulk_post.json`](examples/raw/whatsapp/send_bulk_v1_messages_bulk_post.json) `operationId=send_bulk_v1_messages_bulk_post` path `{}` query `{}` body `{"template_name": "odeme_hatirlatici", "recipients": [{"to": "905001112233"}]}`
- `POST /v1/messages/otp` — OTP / Kimlik Doğrulama Mesajı Gönder: [`examples/raw/whatsapp/send_otp_v1_messages_otp_post.json`](examples/raw/whatsapp/send_otp_v1_messages_otp_post.json) `operationId=send_otp_v1_messages_otp_post` path `{}` query `{}` body `{"to": "905001112233", "template_name": "siparis_onay"}`
- `POST /v1/messages/utility` — Utility / İşlemsel Mesaj Gönder: [`examples/raw/whatsapp/send_utility_v1_messages_utility_post.json`](examples/raw/whatsapp/send_utility_v1_messages_utility_post.json) `operationId=send_utility_v1_messages_utility_post` path `{}` query `{}` body `{"to": "905001112233", "template_name": "siparis_onay"}`
