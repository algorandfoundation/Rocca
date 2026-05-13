// components/ChessCheckerboard.tsx

import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { Dimensions, StyleSheet, View, ViewStyle } from 'react-native';

type ChessCheckerboardProps = {
  height?: number;
  squareSize?: number;

  /**
   * Light square opacity
   */
  lightOpacity?: number;

  /**
   * Dark square opacity
   */
  darkOpacity?: number;

  /**
   * Optional extra style
   */
  style?: ViewStyle;

  /**
   * Enable bottom fade
   */
  fade?: boolean;
};

const SCREEN_WIDTH = Dimensions.get('window').width;

function ChessCheckerboardComponent({
  height = 420,
  squareSize = 48,
  lightOpacity = 0.05,
  darkOpacity = 0.015,
  style,
  fade = true,
}: ChessCheckerboardProps) {
  const cols = Math.ceil(SCREEN_WIDTH / squareSize);
  const rows = Math.ceil(height / squareSize);

  return (
    <View
      style={[
        styles.container,
        {
          height,
        },
        style,
      ]}
    >
      {Array.from({ length: rows }).map((_, row) => (
        <View key={row} style={styles.row}>
          {Array.from({ length: cols }).map((_, col) => {
            const isLight = (row + col) % 2 === 0;

            return (
              <View
                key={`${row}-${col}`}
                style={[
                  styles.square,
                  {
                    width: squareSize,
                    height: squareSize,
                    backgroundColor: `rgba(255,255,255,${isLight ? lightOpacity : darkOpacity})`,
                  },
                ]}
              />
            );
          })}
        </View>
      ))}

      {/* Bottom fade */}
      {fade && (
        <LinearGradient
          colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.25)', '#000000']}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}

      {/* Subtle vignette */}
      <View style={styles.vignette} pointerEvents="none" />
    </View>
  );
}

export const ChessCheckerboard = memo(ChessCheckerboardComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
  },

  square: {},

  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
});
