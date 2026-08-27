import { apiFetch } from './api-client';

export type MyProfileResponse = {
  email: string;
  username?: string | null;
  role: string;
};

export type SignupPayload = {
  email: string;
  password: string;
  username: string;
  birth_date?: string | null;
  gender?: string | null;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  email: string;
  username?: string | null;
  role: string;
};

type ApiMessageResponse = {
  message?: unknown;
  detail?: unknown;
};

function stringifyErrorDetail(detail: unknown) {
  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && 'msg' in item) {
          return String(item.msg);
        }

        return null;
      })
      .filter(Boolean);

    return messages.join('\n');
  }

  if (detail && typeof detail === 'object' && 'msg' in detail) {
    return String(detail.msg);
  }

  return '';
}

function getErrorMessage(data: ApiMessageResponse | null, fallback: string) {
  const detailMessage = stringifyErrorDetail(data?.detail);
  const message = stringifyErrorDetail(data?.message);

  return detailMessage || message || fallback;
}

export async function fetchMyProfile() {
  const response = await apiFetch('/api/auth/me');
  const data = (await response.json().catch(() => null)) as
    | (ApiMessageResponse & Partial<MyProfileResponse>)
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(data, '회원 정보를 불러오지 못했어요.'));
  }

  if (!data?.email || !data.role) {
    throw new Error('회원 정보 응답 형식이 올바르지 않아요.');
  }

  return data as MyProfileResponse;
}

export async function signup(payload: SignupPayload) {
  const response = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as ApiMessageResponse | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(data, '회원가입에 실패했어요.'));
  }

  return data;
}

export async function login(payload: LoginPayload) {
  const response = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = (await response.json().catch(() => null)) as
    | (ApiMessageResponse & Partial<LoginResponse>)
    | null;

  if (!response.ok) {
    throw new Error(getErrorMessage(data, '로그인에 실패했어요.'));
  }

  if (!data?.access_token || !data.email || !data.role) {
    throw new Error('로그인 응답 형식이 올바르지 않아요.');
  }

  return data as LoginResponse;
}
