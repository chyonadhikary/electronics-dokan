
## Second-pass image audit — 2026-09-27

The replacement ZIP contains **19 JPEG images**. All were inspected. Ten previously missing product records now have matching assets attached:

| Product | New asset | Verification |
|---|---|---|
| XH-M603 | `xh-m603-battery-charging-control-module.webp` | Board image shows battery controller, display and 10A label |
| XH-M602 | `xh-m602-battery-charge-controller.webp` | Mains/relay battery-controller board image; model marking remains revision-dependent |
| MH-M28 / XH-M28 | `mh-m28-bluetooth-receiver.webp` | Board silkscreen visibly reads HX-M28 |
| MH-M38 / XH-M38 | `mh-m38-5w-bluetooth-amplifier.webp` | Bluetooth board image shows 3.7–5V and 2–8Ω / 3–5W audio output |
| W3230 | `w3230-temperature-controller.webp` | Digital microcomputer temperature-controller image with probe and control enclosure |
| MAX9814 | `max9814-microphone-amplifier.webp` | Board text visibly shows selectable 40/50/60dB gain and 1.25V output note |
| MAX4466 | `max4466-microphone-amplifier.webp` | Board text visibly shows 2.4–5.5V and adjustable gain |
| Horizontal float switch | `horizontal-liquid-float-switch.webp` | Side-mount liquid-level float sensor image |
| 1S BMS | `1s-10a-bms.webp` | Image visibly marked 1S |
| 3S BMS | `3s-25a-li-ion-lipo-bms.webp` | Image visibly marked 3S with B1/B2/P+/P− pads |

MQ-135, MQ-2, MQ-3, MQ-7 and MQ-8 images remain correctly model-labelled. No MQ-9 image was supplied, so it intentionally remains without a potentially wrong image.

## Second-pass rule audit

- **Catalogue count:** 177
- **New product family count:** 12
- **Exact XH-M604 duplicate check:** existing listing only; no duplicate created
- **Model/voltage variants:** MQ family and W3230 are grouped; 1S/3S BMS and XH-M603/M604/M602/XY-L10A remain separate where compatibility changes
- **Customer prices:** preserved in BDT
- **Explicit stock counts:** preserved for W3230, MAX9814, MAX4466, float switch and 3S BMS
- **Unknown stock:** remains `Stock quantity to confirm`; no unverified inventory invented
- **URL slugs:** unique and URL-safe
- **Image references:** all newly attached WebP assets exist in `client/public/images/products/`
- **Runtime route check:** live homepage reports 177 catalogue items and renders the new items in New Arrivals
- **Build/deployment:** previous production build passed; the second-pass image update is queued for the next Pages deployment
