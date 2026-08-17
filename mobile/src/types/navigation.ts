import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Splash: undefined;
  Login: undefined;
  Home: NavigatorScreenParams<HomeTabParamList>;
  AddBin: undefined;
  WeighBin: { bin: any };
  CameraCapture: {
    mode: 'tare' | 'weigh';
    binId?: string;
    binName?: string;
    tareWeight?: number;
    tareUnit?: string;
    onWeightDetected?: (weight: number, unit: string) => void;
  };
  WeighResult: {
    binId: string;
    binName: string;
    grossWeight: number;
    grossUnit: string;
    tareWeight: number;
    tareUnit: string;
    ocrConfidence: number;
    ocrRawResult: string;
    processingTimeMs: number;
  };
  WeighingDetail: { weighing: any };
};

export type HomeTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
