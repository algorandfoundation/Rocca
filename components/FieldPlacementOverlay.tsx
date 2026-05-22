import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  type LayoutChangeEvent,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { screenToPdf, pdfToScreen, type PageSize } from '@/utils/pdf-form';
import type { SignatureField } from '@/utils/pdf-sign';

export type FieldKind = 'signature' | 'field';

export type PlacedField = SignatureField & {
  kind: FieldKind;
  label: string;
  content?: string;
  size?: number;
};

interface FieldPlacementOverlayProps {
  children: React.ReactNode;
  fields: PlacedField[];
  pageSizes: PageSize[];
  currentPage: number;
  currentZoom: number;
  isActive: boolean;
  onTapAt: (pdfX: number, pdfY: number, page: number) => void;
  onMoveField: (id: string, pdfX: number, pdfY: number) => void;
  onRemoveField: (id: string) => void;
  onSetFieldSize: (id: string, size: number) => void;
}

const { width: SCREEN_W } = Dimensions.get('window');

export function FieldPlacementOverlay({
  children,
  fields,
  pageSizes,
  currentPage,
  currentZoom,
  isActive,
  onTapAt,
  onMoveField,
  onRemoveField,
  onSetFieldSize,
}: FieldPlacementOverlayProps) {
  const [container, setContainer] = useState({ width: 0, height: 0 });

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setContainer({ width, height });
  }, []);

  const pageW = pageSizes[currentPage - 1]?.width ?? container.width;
  const pageH = pageSizes[currentPage - 1]?.height ?? container.height;

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {children}

      {isActive && (
        <>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFillObject}
            onPress={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              const { x: pdfX, y: pdfY } = screenToPdf(
                locationX,
                locationY,
                container.width,
                container.height,
                pageW,
                pageH,
                currentZoom,
              );
              onTapAt(pdfX, pdfY, currentPage);
            }}
          />

          {fields
            .filter((f) => f.page === currentPage)
            .map((field) => (
              <FieldMarker
                key={field.id}
                field={field}
                containerW={container.width}
                containerH={container.height}
                pageW={pageW}
                pageH={pageH}
                zoom={currentZoom}
                onMove={onMoveField}
                onRemove={onRemoveField}
                onSetSize={onSetFieldSize}
              />
            ))}
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */

interface FieldMarkerProps {
  field: PlacedField;
  containerW: number;
  containerH: number;
  pageW: number;
  pageH: number;
  zoom: number;
  onMove: (id: string, pdfX: number, pdfY: number) => void;
  onRemove: (id: string) => void;
  onSetSize: (id: string, size: number) => void;
}

function FieldMarker({
  field,
  containerW,
  containerH,
  pageW,
  pageH,
  zoom,
  onMove,
  onRemove,
  onSetSize,
}: FieldMarkerProps) {
  const [dragging, setDragging] = useState(false);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  const { x: sx, y: sy } = pdfToScreen(
    field.x,
    field.y,
    containerW,
    containerH,
    pageW,
    pageH,
    zoom,
  );

  /* ---- drag-to-move ---- */
  const movePanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          setDragging(true);
          setOffsetX(0);
          setOffsetY(0);
        },
        onPanResponderMove: (_evt, gestureState) => {
          setOffsetX(gestureState.dx);
          setOffsetY(gestureState.dy);
        },
        onPanResponderRelease: (_evt, gestureState) => {
          const finalScreenX = sx + gestureState.dx + 14;
          const finalScreenY = sy + gestureState.dy + 24;
          const { x: newPdfX, y: newPdfY } = screenToPdf(
            finalScreenX,
            finalScreenY,
            containerW,
            containerH,
            pageW,
            pageH,
            zoom,
          );
          onMove(field.id, newPdfX, newPdfY);
          setDragging(false);
          setOffsetX(0);
          setOffsetY(0);
        },
      }),
    [field, sx, sy, containerW, containerH, pageW, pageH, zoom, onMove],
  );

  /* ---- drag-to-resize ---- */
  const isSignature = field.kind === 'signature';
  const currentSize = field.size ?? (isSignature ? 18 : 14);
  const sizeStartRef = useRef(currentSize);
  useEffect(() => {
    sizeStartRef.current = currentSize;
  }, [currentSize]);

  const resizePanResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          sizeStartRef.current = currentSize;
        },
        onPanResponderMove: (_evt, gestureState) => {
          const newSize = Math.min(32, Math.max(8, sizeStartRef.current + gestureState.dy / 5));
          onSetSize(field.id, Math.round(newSize));
        },
        onPanResponderRelease: () => {},
      }),
    [field.id, onSetSize, currentSize],
  );

  return (
    <View
      style={[
        styles.markerWrapper,
        {
          left: sx - 2 + offsetX,
          top: sy - 28 + offsetY,
          zIndex: dragging ? 100 : 20,
          opacity: dragging ? 0.85 : 1,
        },
      ]}
    >
      {/* X delete button */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(field.id)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <MaterialIcons name="close" size={12} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Draggable body (move) */}
      <View style={styles.moveArea} {...movePanResponder.panHandlers}>
        {isSignature ? (
          <>
            <Text style={[styles.previewName, { fontSize: currentSize }]}>{field.label}</Text>
            <View style={styles.previewUnderline} />
            <Text style={[styles.previewMeta, { fontSize: Math.max(7, currentSize * 0.45) }]}>
              Key: 0xABCD…EF | Sig: 0x1234…AB
            </Text>
            <Text style={[styles.previewTs, { fontSize: Math.max(6, currentSize * 0.38) }]}>
              Rocca · {new Date().toLocaleString()}
            </Text>
            {dragging && <Text style={styles.dragHint}>Release to place</Text>}
          </>
        ) : (
          <>
            {field.content ? (
              <Text style={[styles.previewFieldText, { fontSize: currentSize }]}>
                {field.content}
              </Text>
            ) : (
              <Text
                style={[
                  styles.previewFieldPlaceholder,
                  { fontSize: Math.max(10, currentSize - 4) },
                ]}
              >
                {field.label}
              </Text>
            )}
            {dragging && <Text style={styles.dragHint}>Release to place</Text>}
          </>
        )}
      </View>

      {/* Resize handle (bottom-right) */}
      <View style={styles.resizeHandle} {...resizePanResponder.panHandlers}>
        <MaterialIcons name="open-with" size={10} color="#64748B" />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'flex-start',
    minWidth: 200,
    maxWidth: SCREEN_W * 0.7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    paddingBottom: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1.5,
    borderColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
  },
  moveArea: {
    width: '100%',
    paddingBottom: 4,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  resizeHandle: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 4,
  },
  previewName: {
    fontWeight: '700',
    color: '#0F172A',
    fontStyle: 'italic',
  },
  previewUnderline: {
    width: 140,
    height: 2,
    backgroundColor: '#3B82F6',
    marginVertical: 3,
  },
  previewMeta: {
    color: '#64748B',
    marginTop: 2,
  },
  previewTs: {
    color: '#94A3B8',
    marginTop: 2,
  },
  previewFieldText: {
    fontWeight: '600',
    color: '#0F172A',
  },
  previewFieldPlaceholder: {
    fontWeight: '500',
    color: '#94A3B8',
    fontStyle: 'italic',
  },
  dragHint: {
    marginTop: 2,
    fontSize: 9,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 4,
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
});
