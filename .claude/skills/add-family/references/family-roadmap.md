# Family roadmap — remaining families, highest to lowest value

**Shipped (19):** ldo · dc_dc · mosfet · jfet · bjt · diode · voltage_reference · op_amp ·
comparator · analog_switch · adc · dac · capacitor · resistor · inductor · crystal · led ·
laser_diode · photodiode.

**Value** = how often the part appears on a real analog / mixed-signal / power board × how
cleanly it fits the schema (a discrete, orderable component with a design-grade spec table) ×
how much fresh coverage it adds. **"New units?"** is the planning cost: families needing no
schema change are cheapest. Estimated realistic total universe before hitting module/system
scope: **~55–70 families** (we are ~1/3 through; ~halfway through the high-value core).

The list is roughly ordered; adjacent items are close. Re-judge against the current corpus when
you pick one — a "new units?" guess here is a hypothesis for the corpus to confirm or refute.

---

## Tier 1 — highest value (ubiquitous, clean fit, natural next)

| # | family | headline specs | new units? | notes |
|---|---|---|---|---|
| 1 | **optocoupler** | current transfer ratio (CTR), isolation withstand voltage, CMTI, creepage/clearance | likely **none** (CTR→%, VISO→V, CMTI→V/us exists, creepage→m) | The opto capstone (LED + detector in one isolating package). Output-type discriminator (phototransistor / logic / gate-drive / linear / Darlington), one dict with optional per-output blocks. Photo-triac/SSR-driver: decide in-scope vs a `solid_state_relay` family. Corpus was in progress. |
| 2 | **oscillator** | frequency, stability, phase jitter (s), phase noise (dBc/Hz→dB), pullability (ppm/V), start-up time | likely **none** (jitter→s, phase noise→dB, pullability→ppm/V) | The crystal's active sibling (XO/TCXO/VCXO/OCXO). Reuses much crystal vocab + adds active-device (supply, output type, jitter). Output type CMOS/LVDS/LVPECL/clipped-sine as note-only. |
| 3 | **gate_driver** | peak source/sink current (A), propagation delay, UVLO, deadtime, isolation (for isolated) | likely **none** | Ubiquitous in power. Overlaps the gate-drive optocoupler output block — coordinate. Half-bridge, isolated, and low-side variants. |
| 4 | **transformer** | turns ratio (V/V or 1), inductance, isolation voltage, leakage inductance, DCR, saturation | likely **none** (turns ratio→V/V, isolation→V) | Passive but distinct from inductor (turns ratio + isolation are the headline). Signal, gate-drive, flyback, current-sense transformers. |
| 5 | **temperature_sensor** | accuracy (degC), output type (analog V/°C, digital, resistance), operating range | likely **none** | IC temp sensors (analog, I²C/SPI digital), RTD, thermocouple. The thermistor (passive) is a separate family (#7). Ubiquitous. |
| 6 | **ferrite_bead** | impedance at frequency (ohm), DC resistance, rated current, self-resonant frequency | likely **none** (impedance→ohm at a freq condition) | On nearly every board for EMI. Headline is impedance-vs-frequency (an array over F), distinct from an inductor's inductance. |
| 7 | **thermistor** | R25 (ohm), B-constant (K), tolerance, dissipation constant, tempco | likely **none** (B→K exists, R25→ohm) | NTC/PTC passive. B-constant reuses `K`. Very common (temp sensing, inrush, compensation). |
| 8 | **relay** | coil voltage/current, contact rating (A/V), on-resistance, operate/release time, isolation | likely **none** | Electromechanical + solid-state (SSR). Contact arrangement (SPST/DPDT) as note-only. |
| 9 | **instrumentation_amplifier** | CMRR (dB), gain-set (gain vs Rg), offset, offset drift, bandwidth | **none** | Distinct from op_amp (fixed CMRR-vs-gain, gain-set resistor). High value in sensing. |
| 10 | **current_sense_amplifier** | gain (V/V), input offset, CMRR, common-mode range (high-side), bandwidth | **none** | Ubiquitous in power/battery. High-side/low-side, zero-drift. |

## Tier 2 — high value (common, good fit)

| # | family | headline | new units? | notes |
|---|---|---|---|---|
| 11 | **digital_isolator** | data rate (Hz), propagation delay, CMTI, isolation voltage, per-channel direction | none | The optocoupler's modern capacitive/magnetic replacement — NO LED. Same *function*, different tech → separate family. |
| 12 | **load_switch / eFuse** | on-resistance, current limit, turn-on time, OVP/UVP thresholds, reverse blocking | none | Power-path protection. eFuse adds current-limit/slew. |
| 13 | **supervisor / reset_ic** | threshold accuracy, reset timeout, watchdog period, quiescent current | none | Voltage supervisor, watchdog, reset. Tiny but ubiquitous. |
| 14 | **battery_charger** | charge current, regulation voltage accuracy, termination, input range | none | Li-ion/LiFePO4 chargers. Borderline system-ish for fuel-gauge/BMS — keep to the charger IC. |
| 15 | **led_driver** | output current accuracy, dimming (PWM/analog), current-matching, switching freq | none | Constant-current driver. Overlaps dc_dc; headline is current regulation + dimming. |
| 16 | **level_translator** | channel count, direction, VccA/VccB range, max data rate, propagation delay | none | Voltage/level translators. Very common in digital. |
| 17 | **line_transceiver** | data rate (Hz), common-mode range, bus fault voltage, ESD, node count | none | RS-485/RS-232/CAN/LIN PHY. |
| 18 | **digital_potentiometer** | resolution (bits/taps), end-to-end resistance, INL/DNL, wiper resistance | none (bits exists) | The digital cousin of the potentiometer. |
| 19 | **pll / clock_generator** | frequency range, jitter (s), phase noise (dB), output count/type | none | Clock synthesis/buffering. Overlaps oscillator — keep the raw generator here, the packaged XO in `oscillator`. |
| 20 | **real_time_clock** | frequency accuracy (ppm), timekeeping current, aging, interface | none | RTC ICs. Reuses crystal tempco vocab. |
| 21 | **varistor / MOV** | clamping voltage, energy (J), peak current, capacitance, varistor voltage | none (energy→J, A2s exists) | Surge protection. TVS is already in `diode`; MOV is distinct. |
| 22 | **hall_sensor** | sensitivity (V/T or mV/mT), quiescent output, bandwidth, offset | **maybe** (magnetic flux density T; sensitivity V/T) | Magnetic position/current sensing. `T` (tesla) and `V/T` would be new units — corpus to confirm. |
| 23 | **accelerometer / imu** | sensitivity, noise density, bandwidth, full-scale range, zero-g offset | **maybe** (g, °/s, m/s² — MEMS units) | MEMS motion. Genuinely new units (g, rad/s) — heavier; weigh carefully. |
| 24 | **pressure_sensor** | full-scale pressure, sensitivity, accuracy, output type | **maybe** (Pa — pressure) | `Pa` new unit. |
| 25 | **resettable_fuse (PPTC)** | hold/trip current, resistance, time-to-trip, max voltage | none | Polyfuse. Simple, common. |

## Tier 3 — moderate value (specialty or more system-ish)

sample_and_hold · programmable/variable_gain_amplifier (PGA/VGA) · transimpedance_amplifier
(the photodiode front-end — needs transimpedance gain V/A = ohm... reuses `ohm`, and V/W for
some) · isolation_amplifier · rf_amplifier / lna / pa (gain dB, NF dB, P1dB dBm→W, IP3) ·
rf_switch / rf_attenuator / rf_mixer · antenna (gain dBi, VSWR, impedance) · eeprom / flash /
sram memory (density bits, access time, endurance cycles) · logic_gate / flip_flop / buffer
(propagation delay, drive) · potentiometer (mechanical) · transducer (buzzer/speaker/microphone
— SPL dB, impedance) · solid_state_relay (if split from optocoupler) · thyristor / scr / triac
(holding current, dv/dt, I²t) · igbt (Vce(sat), switching energy J) · current_sensor (Hall
module) · humidity_sensor (%RH) · proximity / tof_sensor · gas_sensor.

## Tier 4 — edge of scope (module/system, weaker fit — likely OUT per anti-goals)

PMIC · MCU / FPGA / DSP · motor_driver · image_sensor · display_module (LCD/OLED) · connector ·
mechanical_switch · battery · solar_cell · power_module. These trend toward behavioral models or
system integration the schema deliberately does not model — revisit only with a strong case.

---

## New-unit watch-list (for families that would actually widen the enum)

Most Tier-1/2 families need **no schema change**. The ones that would:
- `T` (tesla) + `V/T` — Hall / magnetic sensors.
- `Pa` — pressure sensors.
- `g` (acceleration ≈ 9.81 m/s²) or `m/s2`, and `deg/s` or `rad/s` — accelerometer / gyro / IMU.
- `dBm`→`W` is already the convention (convert, keep dBm verbatim) — do NOT add dBm.
- `%RH` — humidity (or keep `%` + note the RH basis).
Adding sensor units is a bigger commitment (a whole physical domain per unit); batch a sensor
push deliberately rather than piecemeal.
