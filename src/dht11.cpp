#include "dht11.h"

#include <Arduino.h>
#include <DHT.h>

const int PIN_DHT = 4;
const unsigned long DHT_MS = 2000;

DHT dht(PIN_DHT, DHT11);
unsigned long lastDhtMs = 0;

void dht11Begin() {
  dht.begin();
  lastDhtMs = millis();
}

void dht11Poll() {
  if (millis() - lastDhtMs < DHT_MS) {
    return;
  }
  lastDhtMs = millis();

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("CLIMATE_FAIL");
    return;
  }

  Serial.print("TEMP ");
  Serial.println((int)temperature);
  Serial.print("HUM ");
  Serial.println((int)humidity);
}
