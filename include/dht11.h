#pragma once

// DHT11 DATA connects to GPIO4.
void dht11Begin();

// Read every 2 seconds. Serial output: TEMP and HUM, or CLIMATE_FAIL on error.
void dht11Poll();
