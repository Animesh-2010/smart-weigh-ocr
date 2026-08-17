import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraCaptureScreen({ route, navigation }: any) {
  const { mode, binId, binName, tareWeight, tareUnit, onWeightDetected } = route.params;
  const { getValidToken } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState('Position the display inside the frame');
  const cameraRef = useRef<CameraView>(null);

  async function captureAndProcess() {
    if (!cameraRef.current || processing) return;

    setProcessing(true);
    setFeedback('Processing image...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });

      if (!photo || !photo.uri) {
        Alert.alert('Error', 'Failed to capture image');
        setProcessing(false);
        return;
      }

      setFeedback('Analyzing weight display...');

      const token = await getValidToken();
      const ocrResult = await api.processOCR(photo.uri, token);

      if (!ocrResult.validation.valid) {
        Alert.alert(
          'Could Not Read Weight',
          ocrResult.validation.error || 'Please retake the photo',
          [
            { text: 'Retake', onPress: () => setProcessing(false) },
            { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' },
          ]
        );
        setProcessing(false);
        return;
      }

      if (!ocrResult.ocr.weight) {
        Alert.alert(
          'No Weight Detected',
          'We could not detect a weight value. Please retake the photo.',
          [
            { text: 'Retake', onPress: () => setProcessing(false) },
            { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' },
          ]
        );
        setProcessing(false);
        return;
      }

      const detectedWeight = ocrResult.ocr.weight;
      const detectedUnit = ocrResult.ocr.unit || 'kg';
      const confidence = ocrResult.ocr.confidence;

      if (confidence < 0.5) {
        Alert.alert(
          'Low Confidence',
          `Detected weight: ${detectedWeight} ${detectedUnit}\nConfidence: ${Math.round(confidence * 100)}%\n\nThis reading may be inaccurate.`,
          [
            {
              text: 'Use This Reading',
              onPress: () => handleWeightResult(detectedWeight, detectedUnit, ocrResult),
            },
            { text: 'Retake', onPress: () => setProcessing(false) },
          ]
        );
      } else {
        Alert.alert(
          'Weight Detected',
          `Detected weight: ${detectedWeight} ${detectedUnit}\nConfidence: ${Math.round(confidence * 100)}%`,
          [
            {
              text: 'Confirm',
              onPress: () => handleWeightResult(detectedWeight, detectedUnit, ocrResult),
            },
            { text: 'Retake', onPress: () => setProcessing(false) },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process image', [
        { text: 'Retry', onPress: () => setProcessing(false) },
      ]);
    }
  }

  async function handleWeightResult(
    weight: number,
    unit: string,
    ocrResult: any
  ) {
    if (mode === 'tare' && onWeightDetected) {
      onWeightDetected(weight, unit);
      navigation.goBack();
      return;
    }

    if (mode === 'weigh' && binId && tareWeight !== undefined && tareUnit) {
      navigation.navigate('WeighResult', {
        binId,
        binName: binName || '',
        grossWeight: weight,
        grossUnit: unit,
        tareWeight,
        tareUnit,
        ocrConfidence: ocrResult.ocr.confidence,
        ocrRawResult: ocrResult.ocr.text,
        processingTimeMs: ocrResult.ocr.processing_time_ms,
      });
      return;
    }

    setProcessing(false);
  }

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#e94560" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Smart Weigh needs camera access to capture weighing machine displays.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permissionCancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back">
        <View style={styles.overlay}>
          <View style={styles.overlayTop}>
            <Text style={styles.instructionText}>
              {mode === 'tare'
                ? 'Place empty bin on scale'
                : `Place ${binName || 'filled bin'} on scale`}
            </Text>
          </View>

          <View style={styles.displayFrameContainer}>
            <View style={styles.displayFrame}>
              <Text style={styles.frameText}>PLACE DISPLAY HERE</Text>
            </View>
          </View>

          <View style={styles.overlayBottom}>
            <Text style={styles.feedbackText}>{feedback}</Text>

            {processing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#e94560" />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={captureAndProcess}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  overlayTop: {
    flex: 0.3,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 20,
  },
  instructionText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  displayFrameContainer: {
    flex: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayFrame: {
    width: SCREEN_WIDTH * 0.75,
    height: 120,
    borderWidth: 3,
    borderColor: '#e94560',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 69, 96, 0.1)',
  },
  frameText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  overlayBottom: {
    flex: 0.3,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  feedbackText: {
    color: '#fff',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#e94560',
  },
  processingContainer: {
    alignItems: 'center',
    gap: 8,
  },
  processingText: {
    color: '#fff',
    fontSize: 14,
  },
  cancelButton: {
    padding: 12,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    color: '#aaa',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#e94560',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  permissionCancelButton: {
    padding: 12,
  },
  permissionCancelText: {
    color: '#aaa',
    fontSize: 14,
  },
});
