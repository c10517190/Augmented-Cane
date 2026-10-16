#pragma once

// Initialize the 1.54-inch SSD1309. SDA = GPIO21, SCL = GPIO22, address = 0x3C.
void oledBegin();

// Draw three lines of text on the display.
void oledShow(const char *line1, const char *line2, const char *line3);
