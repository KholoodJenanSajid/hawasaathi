import React from 'react';
import { HourlyAirPoint } from '../types/air';

interface Chart24hProps {
  hourly: HourlyAirPoint[];
  selectedPollutant?: 'pm2_5' | 'aqi';
}

export const Chart24h: React.FC<Chart24hProps> = ({
  hourly,
  selectedPollutant = 'pm2_5',
}) => {
  if (!hourly || hourly.length === 0) {
    return (
      <div className="alert-box alert-info">
        No hourly forecast points available for this location yet.
      </div>
    );
  }

  // Calculate SVG coordinates
  const width = 800;
  const height = 240;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const values = hourly.map((p) => {
    if (selectedPollutant === 'aqi') return p.aqi ?? 0;
    return p.pm2_5 ?? 0;
  });

  const maxValue = Math.max(100, ...values);
  const yMax = Math.ceil(maxValue * 1.15);

  const getX = (index: number) => {
    const divisor = hourly.length > 1 ? hourly.length - 1 : 1;
    return paddingLeft + (index / divisor) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - (val / yMax) * chartHeight;
  };

  const points = hourly.map((p, idx) => {
    const val = selectedPollutant === 'aqi' ? (p.aqi ?? 0) : (p.pm2_5 ?? 0);
    return `${getX(idx)},${getY(val)}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M ${getX(0)},${paddingTop + chartHeight} L ${points.join(
    ' L '
  )} L ${getX(hourly.length - 1)},${paddingTop + chartHeight} Z`;

  const yTicks = [0, Math.round(yMax * 0.33), Math.round(yMax * 0.66), yMax];

  return (
    <div className="chart-wrapper">
      <div className="chart-container" role="region" aria-label="24-Hour Air Quality Trend Chart">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="chart-svg"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* Y Axis Grid lines and labels */}
          {yTicks.map((tickVal) => {
            const yPos = getY(tickVal);
            return (
              <g key={tickVal}>
                <line
                  x1={paddingLeft}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke="#e2dbcb"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={yPos + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="#706c62"
                  fontWeight="500"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          <path
            d={areaD}
            fill="rgba(158, 42, 43, 0.08)"
          />

          {/* Line path */}
          <path
            d={pathD}
            fill="none"
            stroke="#9e2a2b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & X-axis Labels */}
          {hourly.map((p, idx) => {
            const val = selectedPollutant === 'aqi' ? (p.aqi ?? 0) : (p.pm2_5 ?? 0);
            const x = getX(idx);
            const y = getY(val);
            const showLabel = idx % 3 === 0 || idx === hourly.length - 1;

            return (
              <g key={idx}>
                <circle
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#9e2a2b"
                  strokeWidth="2"
                />
                {showLabel && (
                  <text
                    x={x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="11"
                    fill="#4a473f"
                    fontWeight="600"
                  >
                    {p.displayTime}
                  </text>
                )}
              </g>
            );
          })}

          {/* Units Label */}
          <text
            x={paddingLeft}
            y={14}
            fontSize="11"
            fill="#706c62"
            fontWeight="600"
          >
            {selectedPollutant === 'aqi' ? 'Estimated AQI' : 'PM2.5 (µg/m³)'}
          </text>
        </svg>
      </div>

      {/* Accessible Paired Data Table */}
      <div className="table-container" tabIndex={0} role="region" aria-label="Hourly Air Quality Data Table">
        <table className="data-table">
          <caption>
            Hourly Forecast Concentrations & Estimated CPCB AQI (Next 24 Hours)
          </caption>
          <thead>
            <tr>
              <th scope="col">Time</th>
              <th scope="col">Estimated AQI</th>
              <th scope="col">Category</th>
              <th scope="col">PM2.5 (µg/m³)</th>
              <th scope="col">PM10 (µg/m³)</th>
              <th scope="col">NO2 (µg/m³)</th>
              <th scope="col">SO2 (µg/m³)</th>
              <th scope="col">O3 (µg/m³)</th>
              <th scope="col">CO (mg/m³)</th>
            </tr>
          </thead>
          <tbody>
            {hourly.map((point, index) => (
              <tr key={index}>
                <th scope="row" style={{ fontWeight: 600 }}>
                  {point.displayTime}
                </th>
                <td>
                  <strong>{point.aqi !== null ? point.aqi : '—'}</strong>
                </td>
                <td>
                  <span
                    className={`aqi-category-badge badge-${
                      point.category === 'Severe' || point.category === 'Very Poor'
                        ? 'severe'
                        : point.category === 'Poor' || point.category === 'Moderate'
                        ? 'poor'
                        : point.category === 'Good' || point.category === 'Satisfactory'
                        ? 'good'
                        : 'neutral'
                    }`}
                    style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                  >
                    {point.category}
                  </span>
                </td>
                <td>{point.pm2_5 !== null ? point.pm2_5.toFixed(1) : '—'}</td>
                <td>{point.pm10 !== null ? point.pm10.toFixed(1) : '—'}</td>
                <td>{point.nitrogen_dioxide !== null ? point.nitrogen_dioxide.toFixed(1) : '—'}</td>
                <td>{point.sulphur_dioxide !== null ? point.sulphur_dioxide.toFixed(1) : '—'}</td>
                <td>{point.ozone !== null ? point.ozone.toFixed(1) : '—'}</td>
                <td>{point.carbon_monoxide !== null ? point.carbon_monoxide.toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
