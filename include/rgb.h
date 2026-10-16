#pragma once

// WS2812 DIN connects to GPIO26; drive 24 LEDs. Color supplements other alerts.
void rgbBegin();

void rgbOff();
void rgbGreen();
void rgbYellow();
void rgbRed();
void rgbWhite();
