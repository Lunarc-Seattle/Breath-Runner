/**
 * @file thermal_rom_solver.hpp
 * @brief Time-Indexed Trace-Driven Power & CFD-Calibrated Reduced-Order Thermal Solver
 * @details Integrates IP-level power macromodels (BLE SoC, Piezo Pressure Sensor, Pump Actuator)
 *          and airflow fluid-dynamics traces into a discrete-event / time-stepped state space model.
 */
#pragma once
#include <vector>
#include <array>
#include <cmath>
#include <string>

namespace aerocare::sim {

struct TraceStep {
    uint64_t timestamp_us;
    double airflow_lpm;          // Pulmonary flow workload trace (L/min)
    double soc_active_mw;        // BLE + DSP Macromodel Power (mW)
    double sensor_excitation_mw; // Piezoresistive MEMS Power (mW)
    double valve_actuator_mw;    // Variable Impedance Valve Power (mW)
};

struct ThermalGridFrame {
    uint64_t timestamp_us;
    std::array<double, 16> node_temperatures_c; // 4x4 Spatiotemporal Hotspot Grid
    double peak_hotspot_c;
    double cfd_airflow_cooling_w;
};

class ReducedOrderThermalSolver {
private:
    double ambient_temp_c_ = 24.5;
    double dt_sec_ = 0.001; // 1ms time-stepped resolution
    std::array<double, 16> state_temp_c_;

public:
    explicit ReducedOrderThermalSolver(double ambient = 24.5) : ambient_temp_c_(ambient) {
        state_temp_c_.fill(ambient_temp_c_);
    }

    // Time-stepped RC thermal network + convective CFD airflow macromodel update
    ThermalGridFrame step(const TraceStep& trace) {
        ThermalGridFrame frame{};
        frame.timestamp_us = trace.timestamp_us;
        double total_power_w = (trace.soc_active_mw + trace.sensor_excitation_mw + trace.valve_actuator_mw) * 1e-3;
        
        // Convective cooling from respiratory airflow trace (CFD-calibrated Nusselt correlation)
        double h_conv = 0.015 * std::sqrt(std::max(0.1, std::abs(trace.airflow_lpm)));
        frame.cfd_airflow_cooling_w = h_conv;

        double max_t = ambient_temp_c_;
        for (size_t i = 0; i < 16; ++i) {
            double spatial_weight = (i == 5 || i == 6 || i == 9 || i == 10) ? 1.45 : 0.65;
            double dT = (total_power_w * spatial_weight - h_conv * (state_temp_c_[i] - ambient_temp_c_)) * dt_sec_ * 12.0;
            state_temp_c_[i] += dT;
            frame.node_temperatures_c[i] = state_temp_c_[i];
            if (state_temp_c_[i] > max_t) max_t = state_temp_c_[i];
        }
        frame.peak_hotspot_c = max_t;
        return frame;
    }
};

} // namespace aerocare::sim
