import { IsString, MinLength } from "class-validator";

export class ForgotPasswordDto{
    @IsString()
    email :  string;
}

export class ResetPasswordDto{
    @IsString()
    token: string;

    @IsString()
    @MinLength(6)
    nouveauMotDePasse: string;
}