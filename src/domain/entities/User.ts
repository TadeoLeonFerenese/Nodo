export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: string;
}

// Formulario de registro estricto de exactamente 4 campos
export interface RegisterUserDto {
  username: string;
  email: string;
  password: string;
  passwordConfirmation: string;
}
