#include "mpu6050.h"

#include <Arduino.h>
#include <Wire.h>

const int MPU_ADDR_PRIMARY = 0x68;
const int MPU_ADDR_ALT = 0x69;
const unsigned long MPU_MS = 50;

static unsigned long lastMpuMs = 0;
static bool mpuOk = false;
static int mpuAddr = MPU_ADDR_PRIMARY;
static uint8_t mpuId = 0;

bool mpuProbe(int addr) {
  Wire.beginTransmission(addr);
  return Wire.endTransmission() == 0;
}

bool mpuWrite(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(mpuAddr);
  Wire.write(reg);
  Wire.write(value);
  return Wire.endTransmission() == 0;
}

bool mpuReadRegs(uint8_t reg, uint8_t *buf, size_t len) {
  Wire.beginTransmission(mpuAddr);
  Wire.write(reg);
  if (Wire.endTransmission(false) != 0) {
    return false;
  }
  if (Wire.requestFrom(mpuAddr, len) != (int)len) {
    return false;
  }
  for (size_t i = 0; i < len; i++) {
    buf[i] = Wire.read();
  }
  return true;
}

bool mpuStart() {
  if (mpuProbe(MPU_ADDR_PRIMARY)) {
    mpuAddr = MPU_ADDR_PRIMARY;
  } else if (mpuProbe(MPU_ADDR_ALT)) {
    mpuAddr = MPU_ADDR_ALT;
  } else {
    return false;
  }

  if (!mpuWrite(0x6B, 0x00)) {
    return false;
  }
  mpuWrite(0x1B, 0x00);
  mpuWrite(0x1C, 0x00);
  delay(30);

  uint8_t id = 0;
  if (!mpuReadRegs(0x75, &id, 1)) {
    return false;
  }
  mpuId = id;
  return true;
}

void printMpuStatus() {
  Serial.print("MPU OK 0x");
  Serial.print(mpuAddr, HEX);
  Serial.print(" 0x");
  Serial.println(mpuId, HEX);
}

void mpu6050Begin() {
  mpuOk = mpuStart();
  if (mpuOk) {
    printMpuStatus();
  } else {
    Serial.println("MPU FAIL");
  }
  lastMpuMs = millis();
}

void mpu6050Poll() {
  if (millis() - lastMpuMs < MPU_MS) {
    return;
  }
  lastMpuMs = millis();

  if (!mpuOk) {
    mpuOk = mpuStart();
    if (!mpuOk) {
      Serial.println("MPU FAIL");
      return;
    }
    printMpuStatus();
  }

  uint8_t raw[14];
  if (!mpuReadRegs(0x3B, raw, 14)) {
    Serial.println("MPU READ_FAIL");
    mpuOk = false;
    return;
  }

  int16_t ax = (raw[0] << 8) | raw[1];
  int16_t ay = (raw[2] << 8) | raw[3];
  int16_t az = (raw[4] << 8) | raw[5];
  int16_t tempRaw = (raw[6] << 8) | raw[7];
  int16_t gx = (raw[8] << 8) | raw[9];
  int16_t gy = (raw[10] << 8) | raw[11];
  int16_t gz = (raw[12] << 8) | raw[13];

  Serial.print("IMU ");
  Serial.print(ax / 16384.0, 2);
  Serial.print(" ");
  Serial.print(ay / 16384.0, 2);
  Serial.print(" ");
  Serial.print(az / 16384.0, 2);
  Serial.print(" ");
  Serial.print(gx / 131.0, 1);
  Serial.print(" ");
  Serial.print(gy / 131.0, 1);
  Serial.print(" ");
  Serial.print(gz / 131.0, 1);
  Serial.print(" ");
  Serial.println(tempRaw / 340.0 + 36.53, 1);
}
