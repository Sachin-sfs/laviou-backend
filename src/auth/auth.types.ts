export interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
}

export interface AuthRegisterResultDto {
  user: AuthUserDto;
  tokens: AuthTokensDto;
}
