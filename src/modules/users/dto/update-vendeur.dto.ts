import { IsString, IsOptional } from 'class-validator';

export class UpdateVendeurDto {
  @IsOptional()
  @IsString()
  nomBoutique?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  banniere?: string;
}