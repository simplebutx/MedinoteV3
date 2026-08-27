export type MyProfileResponse = {
  email: string;
  userName: string;
  role: string;
};

export async function fetchMyProfile() {
  return {
    email: 'demo@medinote.local',
    userName: 'demo',
    role: 'USER',
  } satisfies MyProfileResponse;
}
