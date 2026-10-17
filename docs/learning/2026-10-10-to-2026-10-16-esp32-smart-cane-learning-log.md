# Learning Log: Developing an ESP32 Smart Cane Prototype

**Learning period:** 10–16 October 2026

**Prepared:** 18 October 2026

During this period, I began by connecting an OLED display and individual sensors. I then worked through firmware uploads, signal levels, sensor update intervals and obstacle alerts. A recurring problem was that the device did not behave as expected after I changed the code. This helped me develop a more systematic approach: check the source file, firmware version, wiring and observed behaviour before drawing a conclusion.

This log brings together my notes from that week. It separates observations from proposed changes. The early infrared tests and the later distance-based alerts belong to different stages of the prototype. The log reflects those stages; it does not establish the current state of the code or report new hardware tests.

## 1. Starting with the OLED display

On 10 October, I focused on connecting the OLED display and preparing to add a DHT11 temperature and humidity sensor. My notes identify the display as using I²C communication and an SSD1309 driver. My first test goal was to display “Hello World”. Before adding the DHT11, I planned the pin connections and installed the required library.

I also began to understand the structure of a PlatformIO project:

```text
project/
├── src/
│   └── main.cpp
├── include/
├── lib/
├── test/
└── platformio.ini
```

`src` is short for “source”. In this project, `src/main.cpp` contains the main programme. `platformio.ini` holds settings such as the development board, software framework and library dependencies.

## 2. Understanding the path from editing to running code

On 11 October, I found that changes made in Cursor did not seem to appear in VS Code.

I learnt that both editors can read and edit the same file on disk when they open the same project folder. If their contents appear different, I need to check the full file paths, whether changes have been saved and whether either editor contains unsaved text. Before reloading a file, I also need to check for changes I want to keep.

I then clarified the role of three PlatformIO steps:

| Step | Purpose | What it tells me |
| --- | --- | --- |
| Build | Compile source code into firmware | The code can be compiled into firmware. |
| Upload | Write the firmware to the board | The upload process has completed; the running version still needs checking. |
| Monitor | Read serial output | Runtime messages and test results can be observed. |

My early notes grouped Build and Upload too closely together. I now understand that saving a file, compiling it, uploading it and confirming the expected hardware behaviour are separate checks.

## 3. Checking power supplies and signal levels

While learning to use the expansion board, I recorded the differences between its 5V, 3V3 and VCC connections. I also noted how the yellow jumper affected the VCC power connections. These observations apply to the board I was using at the time. A different board would require a fresh check of its labels and voltages.

Working with the ultrasonic module helped me understand why the supply voltage and output signal voltage need separate checks. Before connecting Echo to the ESP32, I need to confirm the module model, its output level and the ESP32 input requirements. These checks determine whether a voltage divider or level shifter is needed.

My notes contain more than one ultrasonic pin arrangement. A final wiring table will need to be checked against the relevant code, module and physical connections.

## 4. Testing the DHT11 and scheduling sensor updates

On 13 October, I explored the purpose of `INPUT_PULLUP` and why the DHT11 needs time after power-up before readings are taken.

My initial understanding was that a pull-up provides a default high level and helps prevent an input from floating. The DHT11 wiring still needs to account for any resistors already fitted to the module and its communication requirements.

In my recorded test, breathing towards the sensor increased the temperature and humidity readings. Blowing air towards it with a fan reduced the readings. This showed a response to changing local conditions, although the test did not measure accuracy.

I also learnt to use `millis()` to give different tasks their own update intervals. Temperature and humidity can be read less frequently, while obstacle detection needs a faster response. A two-second delay in the main loop would also delay other tasks. This made me consider how sensing and display updates should be scheduled separately.

## 5. Investigating a buzzer that would not stop

On 13 October, the buzzer kept sounding and the button appeared unable to turn it off. At that stage, the test combined two infrared sensors, a button, a buzzer and a vibration motor. Several conditions could affect the output, which made the cause difficult to identify.

I checked the button wiring, button events in the serial output, whether an infrared sensor remained triggered and the buzzer's active signal level.

My notes identify the buzzer module as active-low: a low I/O signal makes it sound, and a high signal stops it. If the code assigns a low signal to “off”, the displayed state and the physical output will disagree.

There was also uncertainty about which firmware version was running. I used the older `BZ` display layout and the newer `KEY` layout as clues. The display text alone could not explain the full problem, so the upload target, source used for the build and serial start-up messages also needed checking.

The conclusions supported by the notes were:

- The wiring checks and serial button detection had passed at that stage.
- The software's on/off logic needed to match the buzzer's active level.
- Whether the new firmware could stop the buzzer still required a further test after confirming the running version.

This helped me develop a testing habit: check each input and output separately before combining them, and record which firmware version was tested.

## 6. Assessing whether sensor data can be trusted

By 16 October, my notes had moved towards false alarms and outdated readings.

### Valid readings and stable readings

An ultrasonic reading can pass a range check and still be a sudden outlier. For example, readings around 100 cm might briefly drop to 25 cm. Triggering an alert from that single reading could cause a false alarm.

I considered taking the median of several samples and requiring several consecutive readings below the threshold before confirming an obstacle. Both approaches need testing. They may reduce false alarms, but they also add time before an alert, so I need to measure the effect on response time.

### Failed readings and outdated data

A failed reading means that a particular measurement or communication attempt did not succeed. Outdated data means that no new reading has arrived for some time, while the interface may still show the previous value. The interface needs to make both conditions clear.

My notes explored a shared five-second expiry period and, separately, a 200 ms timeout for distance data. These were proposals, and no consistent rule had been established. Each timeout needs to fit the actual update interval. If the normal interval is longer than the timeout, the system could report a fault during normal operation.

### Sensor signals and real-world events

A change in the fall sensor's output can be recorded as “fall sensor triggered”. Confirming that a person has fallen requires further evidence. Changes in MPU6050 orientation readings also need to be interpreted in relation to the sensor's mounting direction and test conditions.

## 7. Considering how people would understand the alerts

As I connected more modules, I began to consider how a person would interpret a vibration or sound. Would the meaning be clear? Would alerts occur too often? Could sound interfere with listening to the surrounding environment?

My notes from 16 October treated obstacles ahead as the main alert priority. They described a later version in which distance alone controlled the buzzer, vibration motor and lights. Temperature, humidity, orientation and fall sensor inputs were used for display or reporting. Additional alert states, patterns and event logging remained ideas to investigate.

Possible directions included:

- Using a small number of recognisable vibration patterns to indicate how close an obstacle is.
- Offering sound as optional support and lights as an additional cue.
- Showing obstacle status and sensor health separately.
- Adjusting settings within the hardware's capabilities and recording the results of each change.

These ideas require controlled testing. I do not yet have evidence of their effectiveness for blind or partially sighted users.

## 8. Next steps

1. Confirm the project path, target board and running firmware, and introduce a clear version identifier.
2. Check the physical modules and update the power, pin and communication records.
3. Retest buzzer control, button detection and vibration separately.
4. Record behaviour during sudden distance changes, out-of-range readings and disconnections.
5. Compare false alarms and response times before and after filtering and consecutive-reading confirmation.
6. Make the device and web interface consistent in how they describe data validity and alert status.

For future experiments, I plan to use the following format to make the results easier to review and reproduce:

```text
Date and firmware version:
Question being tested:
Wiring and test conditions:
Procedure:
Expected behaviour:
Observed behaviour:
Conclusion and remaining uncertainties:
Next step:
```

During this week, I began to see how much work follows the first successful sensor reading. I need to check data reliability, alert timing and the limits of each test before making wider claims. Keeping a clear record helps me identify what the evidence supports and decide what to test next.
