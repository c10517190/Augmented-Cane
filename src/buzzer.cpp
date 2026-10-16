#include "buzzer.h"

#include <Arduino.h>

const int PIN_BUZZER = 25;

void buzzerBegin() {
  // Set high before enabling output to keep the buzzer silent at startup.
  digitalWrite(PIN_BUZZER, HIGH);
  pinMode(PIN_BUZZER, OUTPUT);
}

void buzzerSet(bool on) {
  digitalWrite(PIN_BUZZER, on ? LOW : HIGH);
}
