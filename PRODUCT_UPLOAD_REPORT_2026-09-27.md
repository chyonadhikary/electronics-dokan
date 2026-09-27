# Electronics Dokan — Product Upload Report

**Upload date:** 2026-09-27  
**Repository:** `chyonadhikary/electronics-dokan`  
**Catalogue before upload:** 165 products  
**Catalogue after upload:** 177 products  
**New families:** 12  
**Existing match enriched:** XH-M604

## Important inventory rule used

যেসব product-এর জন্য numeric stock দেওয়া ছিল না, সেগুলো website-এ **Stock quantity to confirm** হিসেবে রাখা হয়েছে। এগুলো catalogue-এ দেখা যাবে, কিন্তু ভুলভাবে in-stock বা checkout-ready দেখানো হবে না। Explicit stock count পাওয়া items-গুলোই active in-stock রাখা হয়েছে।

## Final product list

| # | Product / family | Price | Stock | Decision | URL slug |
|---:|---|---:|---|---|---|
| 1 | MQ-135 / MQ-2 / MQ-3 / MQ-7 / MQ-8 / MQ-9 Gas Sensor Module Family | ৳195 / ৳180 / ৳165 / ৳210 / ৳160 / ৳210 | To confirm | New product with six model variants | `mq-135-mq-2-mq-3-mq-7-mq-8-mq-9-gas-sensor-modules` |
| 2 | XH-M603 Battery Charging Control Module | ৳460 | To confirm | New standalone model; not merged with M604 | `xh-m603-battery-charging-control-module-led-voltage-display` |
| 3 | XH-M604 Digital Battery Charge Control Module | ৳500 | Existing availability retained | Exact existing product enriched; no duplicate | `xh-m604-battery-charge-discharge-controller-module-voltage-protection-board-with-relay-and-display` |
| 4 | XY-L10A Automatic Battery Charge Controller | ৳500 | To confirm | New standalone model; not merged with XH-M604 | `xy-l10a-6-60v-10a-automatic-battery-charge-controller-module` |
| 5 | MH-M28 Bluetooth Audio Receiver Module | ৳165 | To confirm | New product; customer label XH-M28 normalized to MH-M28 with note | `mh-m28-bluetooth-audio-receiver-module` |
| 6 | MH-M38 5W+5W Bluetooth Stereo Amplifier | ৳165 | To confirm | New product; customer label XH-M38 normalized to MH-M38 with note | `mh-m38-5w-5w-bluetooth-stereo-audio-amplifier-module` |
| 7 | XH-M602 Programmable Battery Charge Controller | ৳490 | To confirm | New standalone model; not merged with XH-M604 | `xh-m602-programmable-battery-charge-controller-module-ac-relay` |
| 8 | W3230 Temperature Controller — 220V AC | ৳455 | 3 pcs | Variant under one W3230 family | `w3230-digital-temperature-controller-220v-ac-12v-dc` |
| 9 | W3230 Temperature Controller — 12V DC | ৳455 | 3 pcs | Variant under one W3230 family | `w3230-digital-temperature-controller-220v-ac-12v-dc` |
| 10 | MAX9814 Electret Microphone Amplifier with AGC | ৳340 | 4 pcs | New standalone product | `max9814-electret-microphone-amplifier-module-agc` |
| 11 | MAX4466 Adjustable-Gain Microphone Amplifier | ৳180 | 5 pcs | New standalone product | `max4466-electret-microphone-amplifier-module-adjustable-gain` |
| 12 | Horizontal Liquid Water Level Float Switch | ৳95 | 8 pcs | New standalone product | `horizontal-liquid-water-level-float-switch` |
| 13 | 1S 3.7V 10A Li-ion/LiPo BMS | ৳55 | To confirm | New standalone product; not merged with 2S/3S BMS | `1s-3-7v-10a-li-ion-lipo-battery-bms-protection-board` |
| 14 | 3S 25A Li-ion/LiPo BMS | ৳280 | 3 pcs | New standalone product; kept separate from existing 3S 20A | `3s-25a-li-ion-lipo-battery-bms-protection-board-11-1v-12-6v` |

## Supplied image mapping

The eight supplied images were converted to WebP and copied into `client/public/images/products/`.

| Image asset | Identified product |
|---|---|
| `mq-2-gas-sensor-module.webp` | MQ-2 |
| `mq-135-gas-sensor-module.webp` | MQ-135 |
| `mq-7-gas-sensor-module.webp` | MQ-7 |
| `mq-8-gas-sensor-module.webp` | MQ-8 |
| `mq-3-gas-sensor-module.webp` | MQ-3 |
| `xh-m603-battery-charging-control-module.webp` | Generic battery controller image; provisional XH-M603 candidate, model marking not confirmed |
| `xy-l10a-battery-charge-controller.webp` | XY-L10A / XY-L30A-labelled image; used for XY-L10A with a revision note |
| `3s-25a-li-ion-lipo-bms.webp` | 3S BMS board; 3S marking confirmed, 25A rating not visually confirmed |

No supplied image was confidently identified as MAX9814, MAX4466, MH-M28, MH-M38, W3230, horizontal float switch, 1S BMS or XH-M602. Those records use the site's placeholder until a matching photo is supplied. XH-M602 is not assigned the provisional XH-M603 image in this upload report because the board marking is not confirmed.

## Match and variant decisions

- **XH-M604:** exact match found in the existing JSON record. It was enriched in place instead of duplicated.
- **XH-M603, XH-M602 and XY-L10A:** related battery controllers, but distinct model names and different published electrical claims; kept as separate products.
- **W3230:** 220V AC and 12V DC were created as variants because they are the same controller family with a meaningful supply-voltage choice.
- **MQ series:** created as six selectable model variants under one family because the sensing target differs by model.
- **1S / 3S BMS:** kept separate from existing 2S and 3S 20A records because series count and current class change compatibility and safety.
- **MH-M28 / MH-M38:** research sources commonly use `MH-M28` / `MH-M38`; customer-supplied `XH-` spelling was retained as a keyword and the normalized name is documented in the copy.

## Research sources used

- [Winsen MQ-135 manual](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ135%20(Ver1.4)%20-%20Manual.pdf)
- [Winsen MQ-2 manual](https://www.winsen-sensor.com/d/files/PDF/Semiconductor%20Gas%20Sensor/MQ-2%20(Ver1.4)%20-%20Manual.pdf)
- [SparkFun MQ-7 reference](https://www.sparkfun.com/datasheets/Sensors/Biometric/MQ-7.pdf)
- [ElectroPeak XH-M603 reference](https://electropeak.com/xh-m603-battery-charge-control-module)
- [ICStation XH-M604 reference](https://www.icstation.com/mobile/m604-charge-control-module-battery-protection-board-controller-lithiumlead-acid-battery-solar-panel-p-11314.html)
- [RoboFactory XY-L10A reference](https://www.robofactory.co.za/charging-modules/526-xy-l10a-6-60v-10a-battery-charge-control-display.html)
- [M18/M28/M38 family datasheet](https://www.mantech.co.za/datasheets/products/M18-M28-M38-R0.pdf)
- [DFRobot M38 reference](https://www.dfrobot.com/product-2083.html)
- [W3230 manual](https://sah.rs/media/sah/techdocs/w3230-manual.pdf)
- [OMCH W3230 reference](https://www.omchsmps.com/w3230-temperature-controllers/)
- [Analog Devices MAX9814 datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/max9814.pdf)
- [Analog Devices MAX4466 reference](https://www.analog.com/en/products/max4466.html)
- [Adafruit MAX4466 guide](https://learn.adafruit.com/adafruit-microphone-amplifier-breakout/overview)
- [Float switch basics](https://apgsensors.com/the-basics-of-float-switches-guide/)
- [DIYMore 1S 10A BMS reference](https://www.diymore.cc/products/1s-3-7-v-10-a-li-on-lithium-bms-pcm-battery-protection-board-compatible-with-18650-li-on-lithium-battery)
- [3S 25A BMS reference](https://shillehtek.com/products/3s-12v-18650-lithium-battery-protection-board-11-1v-12-6v-balanced-25a)

## Verification status

- JSON catalogue count: **177**
- New family IDs: **12**
- Duplicate IDs/slugs: **none detected**
- TypeScript check: **passed**
- Production build: **passed**
- Build warnings: existing analytics environment placeholders and large bundle warning; unrelated to this product upload
