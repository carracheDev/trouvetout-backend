import { IsOptional, IsString } from "class-validator";


export class UpdateUserDto {
    @IsOptional()
    @IsString()
    nom?: string;

    @IsOptional()
    @IsString()
    telephone?: string;

    @IsOptional()
    @IsString()
    avatar?: string;
}