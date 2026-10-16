#pragma once

// Fall sensor OUT connects to GPIO27. A stable low level indicates a fall.
void fallBegin();

// Report state changes immediately, otherwise about once per second. Output: POSTURE OK or POSTURE FALL.
void fallPoll();

// Debounced posture state. true indicates a fall.
bool fallFallen();
