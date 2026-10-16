#include "rgb.h"

#include <Adafruit_NeoPixel.h>
#include <Arduino.h>

const int PIN_LED = 26;
const int LED_COUNT = 24;

Adafruit_NeoPixel ring(LED_COUNT, PIN_LED, NEO_GRB + NEO_KHZ800);

void showColor(uint8_t red, uint8_t green, uint8_t blue) {
  ring.fill(ring.Color(red, green, blue));
  ring.show();
}

void rgbOff() {
  ring.clear();
  ring.show();
}

void rgbGreen() {
  showColor(0, 180, 0);
}

void rgbYellow() {
  showColor(255, 180, 0);
}

void rgbRed() {
  showColor(255, 0, 0);
}

void rgbWhite() {
  showColor(180, 180, 180);
}

void rgbBegin() {
  ring.begin();
  ring.setBrightness(80);
  rgbOff();
}
