import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateLivreurDto {
  @IsOptional()
  @IsString()
  numeroCNI?: string;

  @IsOptional()
  @IsString()
  photoCNI?: string;

  @IsOptional()
  @IsString()
  numeroMobileMoney?: string;

  @IsOptional()
  @IsBoolean()
  estDisponible?: boolean;
}