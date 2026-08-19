import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
  Alert,
  PanResponder,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SW, height: SH } = Dimensions.get('window');
const HR = 14;
const SNAP = 30;
const MIN = 50;

type Handle = 'tl' | 'tr' | 'bl' | 'br' | 'mv' | null;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function distance(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(ax - bx, ay - by);
}

export default function CropPreviewScreen({ route, navigation }: any) {
  const {
    imageUri,
    originalWidth,
    originalHeight,
    mode,
    binId,
    binName,
    tareWeight,
    tareUnit,
    onWeightDetected,
  } = route.params;
  const { getValidToken } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);

  const displayH = Math.min(SW * (originalHeight / originalWidth), SH * 0.6);
  const imgTop = (SH - displayH) / 2 - 40;

  const initialBox: Box = {
    x: SW * 0.08,
    y: imgTop + displayH * 0.25,
    w: SW * 0.84,
    h: displayH * 0.35,
  };

  const [box, setBox] = useState<Box>(initialBox);
  const touchRef = useRef<{
    active: Handle;
    startX: number;
    startY: number;
    startBox: Box;
  }>({ active: null, startX: 0, startY: 0, startBox: initialBox });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const px = evt.nativeEvent.pageX;
        const py = evt.nativeEvent.pageY;
        let handle: Handle = null;

        const corners: Array<[Handle, number, number]> = [
          ['tl', box.x, box.y],
          ['tr', box.x + box.w, box.y],
          ['bl', box.x, box.y + box.h],
          ['br', box.x + box.w, box.y + box.h],
        ];

        for (const [id, cx, cy] of corners) {
          if (distance(px, py, cx, cy) < SNAP) {
            handle = id;
            break;
          }
        }

        if (!handle) {
          if (
            px >= box.x &&
            px <= box.x + box.w &&
            py >= box.y &&
            py <= box.y + box.h
          ) {
            handle = 'mv';
          }
        }

        touchRef.current = {
          active: handle,
          startX: px,
          startY: py,
          startBox: { ...box },
        };
      },

      onPanResponderMove: (_, evt) => {
        const { active, startX, startY, startBox } = touchRef.current;
        if (!active) return;

        const dx = evt.moveX - startX;
        const dy = evt.moveY - startY;
        const sb = startBox;
        const nb: Box = { ...sb };

        if (active === 'mv') {
          nb.x = clamp(sb.x + dx, 0, SW - sb.w);
          nb.y = clamp(sb.y + dy, imgTop, imgTop + displayH - sb.h);
        } else {
          if (active.includes('l')) {
            const nx = clamp(sb.x + dx, 0, sb.x + sb.w - MIN);
            nb.w += nb.x - nx;
            nb.x = nx;
          }
          if (active.includes('r')) {
            nb.w = clamp(sb.w + dx, MIN, SW - sb.x);
          }
          if (active.includes('t')) {
            const ny = clamp(sb.y + dy, imgTop, sb.y + sb.h - MIN);
            nb.h += nb.y - ny;
            nb.y = ny;
          }
          if (active.includes('b')) {
            nb.h = clamp(sb.h + dy, MIN, imgTop + displayH - sb.y);
          }
        }

        setBox(nb);
      },

      onPanResponderRelease: () => {
        touchRef.current.active = null;
      },
    }),
  ).current;

  async function handleAnalyze() {
    setAnalyzing(true);
    try {
      const scaleX = originalWidth / SW;
      const scaleY = originalHeight / displayH;

      const cropX = Math.max(0, Math.round(box.x * scaleX));
      const cropY = Math.max(
        0,
        Math.round((box.y - imgTop) * scaleY),
      );
      const cropW = Math.min(
        Math.round(box.w * scaleX),
        originalWidth - cropX,
      );
      const cropH = Math.min(
        Math.round(box.h * scaleY),
        originalHeight - cropY,
      );

      if (cropW < 30 || cropH < 30) {
        Alert.alert('Box Too Small', 'Please enlarge the selection box to cover the display.');
        setAnalyzing(false);
        return;
      }

      const cropped = await ImageManipulator.manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: cropX,
              originY: cropY,
              width: cropW,
              height: cropH,
            },
          },
        ],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const token = await getValidToken();
      const ocrResult = await api.processOCR(cropped.uri, token);

      if (!ocrResult.validation.valid) {
        Alert.alert(
          'Could Not Read Weight',
          ocrResult.validation.error || 'Please adjust the box or retake the photo.',
          [
            { text: 'Adjust Box', onPress: () => setAnalyzing(false) },
            { text: 'Retake', onPress: () => navigation.goBack() },
          ],
        );
        return;
      }

      if (!ocrResult.ocr.weight) {
        Alert.alert(
          'No Weight Detected',
          'Could not detect a weight value in the selected area.',
          [
            { text: 'Adjust Box', onPress: () => setAnalyzing(false) },
            { text: 'Retake', onPress: () => navigation.goBack() },
          ],
        );
        return;
      }

      const detectedWeight = ocrResult.ocr.weight;
      const detectedUnit = ocrResult.ocr.unit || 'kg';

      Alert.alert(
        'Weight Detected',
        `Detected weight: ${detectedWeight} ${detectedUnit}\nConfidence: ${Math.round(ocrResult.ocr.confidence * 100)}%`,
        [
          {
            text: 'Confirm',
            onPress: () => {
              if (mode === 'tare' && onWeightDetected) {
                onWeightDetected(detectedWeight, detectedUnit);
                navigation.pop(2);
              } else if (mode === 'weigh' && binId) {
                navigation.navigate('WeighResult', {
                  binId,
                  binName: binName || '',
                  grossWeight: detectedWeight,
                  grossUnit: detectedUnit,
                  tareWeight,
                  tareUnit,
                  ocrConfidence: ocrResult.ocr.confidence,
                  ocrRawResult: ocrResult.ocr.text,
                  processingTimeMs: ocrResult.ocr.processing_time_ms,
                });
              }
            },
          },
          { text: 'Retake', onPress: () => navigation.goBack() },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process image', [
        { text: 'OK', onPress: () => setAnalyzing(false) },
      ]);
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Weight Display</Text>
        <Text style={styles.subtitle}>
          Adjust the box to cover only the weight display
        </Text>
      </View>

      <View style={{ height: displayH }}>
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />

        <View style={styles.overlay} {...panResponder.panHandlers}>
          <View
            style={[
              styles.dark,
              { top: 0, left: 0, right: 0, height: box.y },
            ]}
          />
          <View
            style={[
              styles.dark,
              {
                top: box.y + box.h,
                left: 0,
                right: 0,
                bottom: 0,
              },
            ]}
          />
          <View
            style={[
              styles.dark,
              {
                top: box.y,
                left: 0,
                width: box.x,
                height: box.h,
              },
            ]}
          />
          <View
            style={[
              styles.dark,
              {
                top: box.y,
                left: box.x + box.w,
                right: 0,
                height: box.h,
              },
            ]}
          />

          <View
            style={[
              styles.cropBorder,
              {
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
              },
            ]}
          >
            {(['tl', 'tr', 'bl', 'br'] as const).map((pos) => (
              <View
                key={pos}
                style={[
                  styles.handle,
                  {
                    left: pos.includes('l') ? -HR : box.w - HR,
                    top: pos.includes('t') ? -HR : box.h - HR,
                  },
                ]}
              />
            ))}

            <View style={styles.cornerGuide}>
              <View style={styles.guideLineH} />
              <View style={styles.guideLineV} />
            </View>

            <Text style={styles.boxLabel}>WEIGHT</Text>
          </View>
        </View>
      </View>

      <Text style={styles.instruction}>
        Drag corners to resize. Drag inside to move.
      </Text>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.retakeBtn}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retakeBtnText}>Retake</Text>
        </TouchableOpacity>

        {analyzing ? (
          <View style={styles.analyzingRow}>
            <ActivityIndicator size="large" color="#e94560" />
            <Text style={styles.analyzingText}>Analyzing display...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.analyzeBtn} onPress={handleAnalyze}>
            <Text style={styles.analyzeBtnText}>Analyze</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: '#0a0a1a',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  image: {
    width: SW,
    height: '100%',
    backgroundColor: '#111',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  dark: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cropBorder: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#e94560',
    borderStyle: 'solid',
  },
  handle: {
    position: 'absolute',
    width: HR * 2,
    height: HR * 2,
    borderRadius: HR,
    backgroundColor: '#e94560',
    borderWidth: 2,
    borderColor: '#fff',
  },
  cornerGuide: {
    flex: 1,
    position: 'absolute',
  },
  guideLineH: {
    position: 'absolute',
    top: '33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(233,69,96,0.3)',
  },
  guideLineV: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(233,69,96,0.3)',
  },
  boxLabel: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(233,69,96,0.6)',
    letterSpacing: 2,
  },
  instruction: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
    paddingVertical: 12,
    backgroundColor: '#0a0a1a',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#16213e',
  },
  retakeBtn: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  retakeBtnText: {
    color: '#aaa',
    fontSize: 17,
    fontWeight: '500',
  },
  analyzeBtn: {
    backgroundColor: '#e94560',
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  analyzeBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  analyzingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  analyzingText: {
    color: '#fff',
    fontSize: 16,
  },
});
