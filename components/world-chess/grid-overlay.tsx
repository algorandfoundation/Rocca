import React from 'react';
import { Dimensions } from 'react-native';
import { Defs, LinearGradient, Rect, Stop, Svg } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

const GridOverlay = ({ width = screenWidth, height = screenWidth, cell = 46.875 }) => {
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);

  return (
    <Svg width={width} height={height}>
      {/* Checker grid */}
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => {
          const isDark = (row + col) % 2 === 0;

          return (
            <Rect
              key={`${row}-${col}`}
              x={col * cell}
              y={row * cell}
              width={cell}
              height={cell}
              fill={isDark ? 'black' : 'white'}
              opacity={0.2}
            />
          );
        }),
      )}

      {/* Gradient overlay */}
      <Rect width={width} height={height} fill="url(#grad)" />

      <Defs>
        <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopOpacity="0" stopColor="black" />
          <Stop offset="1" stopOpacity="1" stopColor="black" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
};

export default GridOverlay;
