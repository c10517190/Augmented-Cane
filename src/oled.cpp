#include "oled.h"

#include <Arduino.h>
#include <U8g2lib.h>
#include <Wire.h>

// Display: SDA = GPIO21, SCL = GPIO22.
const int PIN_SDA = 21;
const int PIN_SCL = 22;

// 1.54-inch SSD1309 display, 128x64 pixels.
U8G2_SSD1309_128X64_NONAME0_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE, PIN_SCL, PIN_SDA);

void oledBegin() {
  // The previous I2C scan detected address 0x3C.
  Wire.begin(PIN_SDA, PIN_SCL);
  u8g2.setI2CAddress(0x3C << 1);
  u8g2.begin();
}

void oledShow(const char *line1, const char *line2, const char *line3) {
  u8g2.clearBuffer();
  // Compact Latin font. All three baselines fit within the 64-pixel display height.
  u8g2.setFont(u8g2_font_6x13_tf);
  u8g2.drawUTF8(0, 18, line1);
  u8g2.drawUTF8(0, 40, line2);
  u8g2.drawUTF8(0, 62, line3);
  u8g2.sendBuffer();
}
