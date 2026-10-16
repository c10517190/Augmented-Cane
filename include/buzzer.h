#pragma once

// Buzzer S connects to GPIO25. Active low.
void buzzerBegin();

// true turns the buzzer on; false turns it off.
void buzzerSet(bool on);
