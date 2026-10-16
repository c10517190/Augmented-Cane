#pragma once

// Vibration motor S connects to GPIO13. Active high.
void motorBegin();

// true turns vibration on; false turns it off.
void motorSet(bool on);
