export type Resolution = '480p' | '720p' | '1080p' | '4K';

export interface RunwayModelConfig {
  id: string;
  label: string;
  apiModelId: string;
  endpoint: '/v1/text_to_video';
  ratios: Partial<Record<Resolution, Record<string, string>>>;
  durations: number[];
  imageReferenceSupport: 'multiple' | 'none';
  maxReferenceImages: number;
  audioSupport: boolean;
}

const range = (start: number, end: number) =>
  Array.from({ length: end - start + 1 }, (_, index) => start + index);

export const RUNWAY_MODELS: Record<string, RunwayModelConfig> = {
  seedance2_5: {
    id: 'seedance2_5', label: 'Seedance 2.5', apiModelId: 'seedance2_5', endpoint: '/v1/text_to_video',
    ratios: {
      '480p': { '21:9': '992:432', '16:9': '854:480', '4:3': '752:560', '1:1': '640:640', '3:4': '560:752', '9:16': '480:854' },
      '720p': { '21:9': '1470:630', '16:9': '1280:720', '4:3': '1112:834', '1:1': '960:960', '3:4': '834:1112', '9:16': '720:1280' },
      '1080p': { '21:9': '2206:946', '16:9': '1920:1080', '4:3': '1664:1248', '1:1': '1440:1440', '3:4': '1248:1664', '9:16': '1080:1920' },
    },
    durations: range(4, 30), imageReferenceSupport: 'multiple', maxReferenceImages: 30, audioSupport: true,
  },
  seedance2: {
    id: 'seedance2', label: 'Seedance 2.0', apiModelId: 'seedance2', endpoint: '/v1/text_to_video',
    ratios: {
      '480p': { '21:9': '992:432', '16:9': '864:496', '4:3': '752:560', '1:1': '640:640', '3:4': '560:752', '9:16': '496:864' },
      '720p': { '21:9': '1470:630', '16:9': '1280:720', '4:3': '1112:834', '1:1': '960:960', '3:4': '834:1112', '9:16': '720:1280' },
      '1080p': { '21:9': '2206:946', '16:9': '1920:1080', '4:3': '1664:1248', '1:1': '1440:1440', '3:4': '1248:1664', '9:16': '1080:1920' },
      '4K': { '21:9': '3840:1646', '16:9': '3840:2160', '4:3': '3840:2880', '1:1': '3840:3840', '3:4': '2880:3840', '9:16': '2160:3840' },
    },
    durations: range(4, 15), imageReferenceSupport: 'multiple', maxReferenceImages: 9, audioSupport: true,
  },
  gen4_5: {
    id: 'gen4_5', label: 'Gen-4.5', apiModelId: 'gen4.5', endpoint: '/v1/text_to_video',
    ratios: { '720p': { '16:9': '1280:720', '9:16': '720:1280' } },
    durations: range(2, 10), imageReferenceSupport: 'none', maxReferenceImages: 0, audioSupport: false,
  },
  wan3: {
    id: 'wan3', label: 'WAN 3.0', apiModelId: 'wan3', endpoint: '/v1/text_to_video',
    ratios: {
      '480p': { '16:9': '832:480', '4:3': '720:544', '1:1': '624:624', '3:4': '544:720', '9:16': '480:832' },
      '720p': { '16:9': '1280:720', '4:3': '1104:832', '1:1': '960:960', '3:4': '832:1104', '9:16': '720:1280' },
      '1080p': { '16:9': '1920:1080', '4:3': '1648:1248', '1:1': '1440:1440', '3:4': '1248:1648', '9:16': '1080:1920' },
    },
    durations: range(2, 30), imageReferenceSupport: 'multiple', maxReferenceImages: 10, audioSupport: true,
  },
};

export const publicModelConfigs = Object.values(RUNWAY_MODELS).map((model) => ({
  id: model.id,
  label: model.label,
  resolutions: Object.keys(model.ratios),
  ratios: Object.fromEntries(Object.entries(model.ratios).map(([resolution, ratios]) => [resolution, Object.keys(ratios ?? {})])),
  durations: model.durations,
  imageReferenceSupport: model.imageReferenceSupport,
  audioSupport: model.audioSupport,
}));
