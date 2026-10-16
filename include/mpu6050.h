#pragma once

// Shares I2C with the display. Probe 0x68, then 0x69. Print MPU OK or MPU FAIL.
void mpu6050Begin();

// Read every 50 ms. Output IMU, or MPU FAIL / MPU READ_FAIL on error.
void mpu6050Poll();
