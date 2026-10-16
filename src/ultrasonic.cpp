#include "ultrasonic.h"

#include "oled.h"

#include <Arduino.h>
#include <stdio.h>

const int PIN_TRIG = 18;
const int PIN_ECHO = 19;

const int SAMPLE_COUNT = 5;
const int CONFIRM_COUNT = 3;
const unsigned long INTERVAL_MS = 500;
const unsigned long OLED_MS = 2000;
const unsigned long PING_GAP_MS = 60;

static unsigned long lastMeasureMs = 0;
static unsigned long batchStartedMs = 0;
static unsigned long lastOledMs = 0;
static unsigned long lastPingMs = 0;
static bool oledDrawn = false;
static bool haveSample = false;
static bool batching = false;
static int batchCount = 0;
static int batch[SAMPLE_COUNT];
static int recentCount = 0;
static int recent[CONFIRM_COUNT];
static int lastCm = -1;
static UltrasonicLevel heldLevel = ULTRASONIC_NORMAL;

void ultrasonicBegin() {
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_TRIG, LOW);
}

bool readDistanceCm(int &cm) {
  digitalWrite(PIN_TRIG, LOW);
  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH);
  delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);

  // Wait up to 30 ms (about 5 meters), covering the 400 cm range.
  unsigned long echoUs = pulseIn(PIN_ECHO, HIGH, 30000);
  if (echoUs == 0) {
    return false;
  }

  int distance = echoUs / 58;
  if (distance < ULTRASONIC_MIN_CM || distance > ULTRASONIC_MAX_CM) {
    return false;
  }
  cm = distance;
  return true;
}

const char *levelTitle(int warnCm) {
  switch (ultrasonicLevel(warnCm)) {
    case ULTRASONIC_CLOSE:
      return "Very close";
    case ULTRASONIC_NEAR:
      return "Near";
    case ULTRASONIC_INVALID:
      return "Out of range";
    case ULTRASONIC_NORMAL:
      if (lastCm >= 0) {
        int nearCm = warnCm * 2;
        if (nearCm > ULTRASONIC_MAX_CM) {
          nearCm = ULTRASONIC_MAX_CM;
        }
        if (lastCm < nearCm) {
          return "Confirming";
        }
      }
      return "Normal";
    default:
      return "Distance";
  }
}

void drawScreen(int cm, int warnCm) {
  char line2[16];
  char line3[20];
  snprintf(line3, sizeof(line3), "Threshold %dcm", warnCm);
  if (cm >= 0) {
    snprintf(line2, sizeof(line2), "%d cm", cm);
    oledShow(levelTitle(warnCm), line2, line3);
    return;
  }
  oledShow(levelTitle(warnCm), "Out of range", line3);
}

void ultrasonicRedraw(int cm, int warnCm) {
  drawScreen(cm, warnCm);
}

int median5(const int *values) {
  int sorted[SAMPLE_COUNT];
  for (int i = 0; i < SAMPLE_COUNT; i++) {
    sorted[i] = values[i];
  }
  for (int i = 1; i < SAMPLE_COUNT; i++) {
    int key = sorted[i];
    int j = i - 1;
    while (j >= 0 && sorted[j] > key) {
      sorted[j + 1] = sorted[j];
      j--;
    }
    sorted[j + 1] = key;
  }
  return sorted[SAMPLE_COUNT / 2];
}

void remember(int cm) {
  if (recentCount < CONFIRM_COUNT) {
    recent[recentCount++] = cm;
    return;
  }
  for (int i = 1; i < CONFIRM_COUNT; i++) {
    recent[i - 1] = recent[i];
  }
  recent[CONFIRM_COUNT - 1] = cm;
}

void publish(int cm, int warnCm) {
  remember(cm);
  haveSample = true;
  lastCm = cm >= 0 ? cm : -1;
  lastMeasureMs = millis();
  bool refreshOled = !oledDrawn || lastMeasureMs - lastOledMs >= OLED_MS;
  if (refreshOled) {
    drawScreen(cm, warnCm);
    lastOledMs = lastMeasureMs;
    oledDrawn = true;
  }
  if (cm >= 0) {
    Serial.print("DIST ");
    Serial.println(cm);
    return;
  }
  Serial.println("RANGE_OVER");
}

int ultrasonicPoll(int warnCm) {
  unsigned long now = millis();
  if (!batching) {
    if (haveSample && now - batchStartedMs < INTERVAL_MS) {
      return lastCm;
    }
    batching = true;
    batchCount = 0;
    lastPingMs = 0;
    batchStartedMs = now;
  }
  if (lastPingMs != 0 && now - lastPingMs < PING_GAP_MS) {
    return lastCm;
  }

  int cm = 0;
  batch[batchCount++] = readDistanceCm(cm) ? cm : -1;
  lastPingMs = millis();
  if (batchCount < SAMPLE_COUNT) {
    return lastCm;
  }

  batching = false;
  publish(median5(batch), warnCm);
  return lastCm;
}

bool ultrasonicReady() {
  return haveSample;
}

int exitGap(int warnCm) {
  int gap = warnCm / 2;
  if (gap < ULTRASONIC_MIN_CM) {
    gap = ULTRASONIC_MIN_CM;
  }
  return gap;
}

UltrasonicLevel ultrasonicLevel(int warnCm) {
  if (!haveSample) {
    heldLevel = ULTRASONIC_NORMAL;
    return ULTRASONIC_WAIT;
  }
  if (lastCm < 0) {
    heldLevel = ULTRASONIC_NORMAL;
    return ULTRASONIC_INVALID;
  }
  if (recentCount < CONFIRM_COUNT) {
    return ULTRASONIC_NORMAL;
  }

  int nearCm = warnCm * 2;
  if (nearCm > ULTRASONIC_MAX_CM) {
    nearCm = ULTRASONIC_MAX_CM;
  }
  int gap = exitGap(warnCm);
  int closeExit = warnCm + gap;
  int nearExit = nearCm + gap;
  if (closeExit > ULTRASONIC_MAX_CM) {
    closeExit = ULTRASONIC_MAX_CM;
  }
  if (nearExit > ULTRASONIC_MAX_CM) {
    nearExit = ULTRASONIC_MAX_CM;
  }

  bool allClose = true;
  bool allNear = true;
  bool beyondClose = true;
  bool beyondNear = true;
  for (int i = 0; i < CONFIRM_COUNT; i++) {
    if (recent[i] < 0) {
      heldLevel = ULTRASONIC_NORMAL;
      return ULTRASONIC_NORMAL;
    }
    if (recent[i] >= warnCm) {
      allClose = false;
    }
    if (recent[i] >= nearCm) {
      allNear = false;
    }
    if (recent[i] < closeExit) {
      beyondClose = false;
    }
    if (recent[i] < nearExit) {
      beyondNear = false;
    }
  }

  if (allClose) {
    heldLevel = ULTRASONIC_CLOSE;
    return ULTRASONIC_CLOSE;
  }
  if (heldLevel == ULTRASONIC_CLOSE && !beyondClose) {
    return ULTRASONIC_CLOSE;
  }
  if (allNear || (heldLevel == ULTRASONIC_CLOSE && !beyondNear)) {
    heldLevel = ULTRASONIC_NEAR;
    return ULTRASONIC_NEAR;
  }
  if (heldLevel == ULTRASONIC_NEAR && !beyondNear) {
    return ULTRASONIC_NEAR;
  }
  heldLevel = ULTRASONIC_NORMAL;
  return ULTRASONIC_NORMAL;
}
