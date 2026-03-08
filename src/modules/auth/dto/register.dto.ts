import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsPhoneNumber,
} from 'class-validator';

export class RegisterDto {
  @IsString()
  nom: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  motDePasse: string;

  @IsOptional()
  @IsString()
  telephone?: string;
}