#pragma once

// HC-SR04 valid range. Alert thresholds use the same bounds.
const int ULTRASONIC_MIN_CM = 2;
const int ULTRASONIC_MAX_CM = 400;

// TRIG = GPIO18, ECHO = GPIO19
void ultrasonicBegin();

// Publish a five-sample median about every 0.5 seconds. Return centimeters, or -1 for invalid range.
// Serial output: DIST or RANGE_OVER. Refresh the OLED every 2 seconds; show the threshold on line 3.
int ultrasonicPoll(int warnCm);

// false until the first batch of five measurements completes.
bool ultrasonicReady();

// Distance bands: very close below the threshold, near below twice it. Entry requires three consecutive results.
// Exit boundaries add half the threshold (at least 2 cm), capped at 400 cm; require three consecutive results to reduce chatter.
enum UltrasonicLevel {
  ULTRASONIC_WAIT = 0,
  ULTRASONIC_NORMAL = 1,
  ULTRASONIC_NEAR = 2,
  ULTRASONIC_CLOSE = 3,
  ULTRASONIC_INVALID = 4
};

UltrasonicLevel ultrasonicLevel(int warnCm);

// Redraw the OLED with the current distance immediately after a threshold update.
void ultrasonicRedraw(int cm, int warnCm);
