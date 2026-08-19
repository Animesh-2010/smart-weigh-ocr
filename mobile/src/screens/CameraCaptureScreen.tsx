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
import { processImageLocally } from '../services/ocr';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CameraCaptureScreen({ route, navigation }: any) {
  const { mode, binId, binName, tareWeight, tareUnit } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const cameraRef = useRef<CameraView>(null);

  async function handleResult(weight: number, unit: string, rawText: string, confidence: number) {
    if (mode === 'tare' && route.params.onWeightDetected) {
      route.params.onWeightDetected(weight, unit);
      navigation.goBack();
      return;
    }
    if (mode === 'weigh' && binId) {
      navigation.navigate('WeighResult', {
        binId,
        binName: binName || '',
        grossWeight: weight,
        grossUnit: unit,
        tareWeight,
        tareUnit,
        ocrConfidence: confidence,
        ocrRawResult: rawText,
        processingTimeMs: 0,
      });
      return;
    }
  }

  async function captureAndProcess() {
    if (!cameraRef.current || processing) return;

    setProcessing(true);
    setFeedback('Capturing...');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        skipProcessing: false,
      });

      if (!photo || !photo.uri) {
        Alert.alert('Error', 'Failed to capture image');
        setProcessing(false);
        return;
      }

      setFeedback('Analyzing full image...');

      const ocrResult = await processImageLocally(photo.uri);

      if (ocrResult.weight) {
        const unit = ocrResult.unit || 'kg';
        Alert.alert(
          'Weight Detected',
          `Detected: ${ocrResult.weight} ${unit}\nConfidence: ${Math.round(ocrResult.confidence * 100)}%\n\nRaw: ${ocrResult.rawText}`,
          [
            {
              text: 'Confirm',
              onPress: () => handleResult(ocrResult.weight!, unit, ocrResult.rawText, ocrResult.confidence),
            },
            { text: 'Crop & Retry', onPress: () => navigateToCrop(photo) },
            { text: 'Retake', onPress: () => setProcessing(false) },
          ],
        );
      } else {
        Alert.alert(
          'No Weight Found',
          ocrResult.rawText
            ? `Detected text:\n"${ocrResult.rawText}"\n\nCould not find a weight value. Try cropping to the display.`
            : 'No text detected. Try pointing the camera directly at the weight display.',
          [
            { text: 'Crop & Adjust', onPress: () => navigateToCrop(photo) },
            { text: 'Retake', onPress: () => setProcessing(false) },
          ],
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to process image', [
        { text: 'Retry', onPress: () => setProcessing(false) },
      ]);
    } finally {
      setProcessing(false);
      setFeedback('');
    }
  }

  function navigateToCrop(photo: any) {
    navigation.replace('CropPreview', {
      imageUri: photo.uri,
      originalWidth: photo.width,
      originalHeight: photo.height,
      mode,
      binId,
      binName,
      tareWeight,
      tareUnit,
      onWeightDetected: route.params.onWeightDetected,
    });
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
            <Text style={styles.subInstructionText}>
              Point camera at the weight display
            </Text>
          </View>

          <View style={styles.displayFrameContainer}>
            <View style={styles.displayFrame}>
              <Text style={styles.frameText}>PLACE DISPLAY HERE</Text>
            </View>
          </View>

          <View style={styles.overlayBottom}>
            {processing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color="#e94560" />
                <Text style={styles.processingText}>{feedback || 'Processing...'}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.captureButton}
                onPress={captureAndProcess}
              >
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
  subInstructionText: {
    color: '#ccc',
    fontSize: 13,
    marginTop: 6,
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
