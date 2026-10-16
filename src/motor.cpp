#include "motor.h"

#include <Arduino.h>

const int PIN_MOTOR = 13;

void motorBegin() {
  // Set low before enabling output to prevent vibration at startup.
  digitalWrite(PIN_MOTOR, LOW);
  pinMode(PIN_MOTOR, OUTPUT);
}

void motorSet(bool on) {
  digitalWrite(PIN_MOTOR, on ? HIGH : LOW);
}
