#include "fall.h"

#include <Arduino.h>

const int PIN_FALL = 27;
const unsigned long FALL_STABLE_MS = 300;
const unsigned long FALL_REPORT_MS = 1000;

bool postureFallen() {
  static int lastReading = -1;
  static int stableLevel = HIGH;
  static unsigned long changedAt = 0;

  int reading = digitalRead(PIN_FALL);
  unsigned long now = millis();
  if (reading != lastReading) {
    lastReading = reading;
    changedAt = now;
  }
  if (now - changedAt >= FALL_STABLE_MS) {
    stableLevel = reading;
  }
  return stableLevel == LOW;
}

void fallBegin() {
  pinMode(PIN_FALL, INPUT_PULLUP);
}

bool fallFallen() {
  return postureFallen();
}

void fallPoll() {
  static int lastFallen = -1;
  static unsigned long lastReportMs = 0;

  bool fallen = postureFallen();
  unsigned long now = millis();
  if (lastFallen == (fallen ? 1 : 0) && now - lastReportMs < FALL_REPORT_MS) {
    return;
  }
  lastFallen = fallen ? 1 : 0;
  lastReportMs = now;
  Serial.println(fallen ? "POSTURE FALL" : "POSTURE OK");
}
