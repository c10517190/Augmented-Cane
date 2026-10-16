#include "buzzer.h"
#include "dht11.h"
#include "fall.h"
#include "motor.h"
#include "mpu6050.h"
#include "oled.h"
#include "rgb.h"
#include "ultrasonic.h"

#include <Arduino.h>

// Below this threshold is very close; below twice it is near. Defaults to 20 cm; a serial integer updates it.
int warnCm = 20;

int lastCm = -1;

const unsigned long PULSE_MS = 70;
const unsigned long PULSE_GAP_MS = 80;
const unsigned long NEAR_QUIET_MS = 1430;
const unsigned long CLOSE_QUIET_MS = 700;
const unsigned long INVALID_ON_MS = 250;
const unsigned long INVALID_QUIET_MS = 2750;
const unsigned long FALL_PULSE_MS = 80;

// Very close: two beeps/vibrations. Near: one. Invalid range: a long beep, no vibration. Fall: three vibrations only in NORMAL.
void updateAlarm() {
  static UltrasonicLevel mode = ULTRASONIC_WAIT;
  static unsigned long mark = 0;
  static bool whiteOn = false;
  static bool fallReady = true;
  static int fallPhase = -1;
  static unsigned long fallAt = 0;

  const UltrasonicLevel level = ultrasonicLevel(warnCm);
  const unsigned long now = millis();
  const bool fallen = fallFallen();
  if (!fallen) {
    fallReady = true;
    fallPhase = -1;
  }

  if (level != mode) {
    mode = level;
    mark = now;
    whiteOn = false;
    buzzerSet(false);
    motorSet(false);
    if (level != ULTRASONIC_NORMAL) {
      fallPhase = -1;
    }
    if (level == ULTRASONIC_WAIT || level == ULTRASONIC_INVALID) {
      rgbOff();
    } else if (level == ULTRASONIC_NORMAL) {
      rgbGreen();
    } else if (level == ULTRASONIC_NEAR) {
      rgbYellow();
    } else if (level == ULTRASONIC_CLOSE) {
      rgbRed();
    }
  }

  unsigned long elapsed = now - mark;
  if (level == ULTRASONIC_NEAR) {
    const unsigned long cycle = PULSE_MS + NEAR_QUIET_MS;
    if (elapsed >= cycle) {
      mark = now;
      elapsed = 0;
    }
    const bool on = elapsed < PULSE_MS;
    buzzerSet(on);
    motorSet(on);
    return;
  }
  if (level == ULTRASONIC_CLOSE) {
    const unsigned long cycle = PULSE_MS + PULSE_GAP_MS + PULSE_MS + CLOSE_QUIET_MS;
    if (elapsed >= cycle) {
      mark = now;
      elapsed = 0;
    }
    const bool first = elapsed < PULSE_MS;
    const bool second = elapsed >= PULSE_MS + PULSE_GAP_MS &&
                        elapsed < PULSE_MS + PULSE_GAP_MS + PULSE_MS;
    const bool on = first || second;
    buzzerSet(on);
    motorSet(on);
    return;
  }
  if (level == ULTRASONIC_INVALID) {
    const unsigned long cycle = INVALID_ON_MS + INVALID_QUIET_MS;
    if (elapsed >= cycle) {
      mark = now;
      elapsed = 0;
    }
    const bool on = elapsed < INVALID_ON_MS;
    buzzerSet(on);
    motorSet(false);
    if (on != whiteOn) {
      whiteOn = on;
      if (on) {
        rgbWhite();
      } else {
        rgbOff();
      }
    }
    return;
  }

  buzzerSet(false);
  if (level != ULTRASONIC_NORMAL) {
    motorSet(false);
    return;
  }

  if (fallen && fallReady && fallPhase < 0) {
    fallReady = false;
    fallPhase = 0;
    fallAt = now;
  }
  if (fallPhase < 0) {
    motorSet(false);
    return;
  }
  if (now - fallAt >= FALL_PULSE_MS) {
    fallPhase++;
    fallAt = now;
  }
  if (fallPhase >= 5) {
    fallPhase = -1;
    motorSet(false);
    return;
  }
  motorSet(fallPhase % 2 == 0);
}

// Serial input: one integer per line, e.g. 30. Valid range: 2 to 400.
void pollSerialThreshold() {
  static char buf[8];
  static size_t len = 0;
  static bool overflow = false;

  while (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '\r') {
      continue;
    }
    if (c != '\n') {
      if (len < sizeof(buf) - 1) {
        buf[len++] = c;
      } else {
        overflow = true;
      }
      continue;
    }

    buf[len] = '\0';
    len = 0;
    if (overflow) {
      overflow = false;
      Serial.println("THRESH_BAD");
      continue;
    }

    char *start = buf;
    while (*start == ' ' || *start == '\t') {
      start++;
    }
    if (*start == '\0') {
      continue;
    }

    char *end = start;
    long value = strtol(start, &end, 10);
    while (*end == ' ' || *end == '\t') {
      end++;
    }
    if (end == start || *end != '\0' || value < ULTRASONIC_MIN_CM || value > ULTRASONIC_MAX_CM) {
      Serial.println("THRESH_BAD");
      continue;
    }

    warnCm = (int)value;
    Serial.print("THRESH ");
    Serial.println(warnCm);
    ultrasonicRedraw(lastCm, warnCm);
  }
}

void setup() {
  Serial.begin(115200);

  ultrasonicBegin();

  buzzerBegin();
  motorBegin();

  fallBegin();

  dht11Begin();

  rgbBegin();

  oledBegin();
  mpu6050Begin();
  Serial.print("THRESH ");
  Serial.println(warnCm);
  while (!ultrasonicReady()) {
    lastCm = ultrasonicPoll(warnCm);
  }
}

void loop() {
  pollSerialThreshold();
  fallPoll();
  mpu6050Poll();

  dht11Poll();

  lastCm = ultrasonicPoll(warnCm);

  updateAlarm();
}
