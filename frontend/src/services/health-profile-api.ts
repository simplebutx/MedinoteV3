export type HealthProfilePayload = {
  isPregnant: boolean;
  isBreastfeeding: boolean;
  isSmoking: boolean;
  isDrinking: boolean;
  isChild: boolean;
  isElderly: boolean;
};

let mockHealthProfile: HealthProfilePayload = {
  isPregnant: false,
  isBreastfeeding: false,
  isSmoking: false,
  isDrinking: false,
  isChild: false,
  isElderly: false,
};

export async function fetchHealthProfile() {
  return mockHealthProfile;
}

export async function saveHealthProfile(payload: HealthProfilePayload) {
  mockHealthProfile = payload;
}
