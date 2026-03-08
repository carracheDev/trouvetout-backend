import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UpdateFcmDto } from './dto/update-fcm.dto';


class ActtiverBoutiqueDto{
    @IsString()
    nomBoutique: string;
}

class DevenirLivreurDto{
    @IsString()
    numeroMobileMoney: string;
}


@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
    constructor(private authService: AuthService) {}

    @Public()
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() dto: LoginDto){
        return this.authService.login(dto);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    refresh(@Body() dto: RefreshTokenDto) {
        return this.authService.refreshToken(dto.refreshToken);
    }

    @Post('fcm-token')
    upadateFcmToken(
        @CurrentUser() user : any,
        @Body() dto: UpdateFcmDto,
    ){
        return this.authService.updateFcmToken(user.id, dto.fcmToken);
    }

    @Post('activer-boutique')
    activerBoutique(
        @CurrentUser() user : any,
        @Body() dto: ActtiverBoutiqueDto,
    ){
        return this.authService.activerBoutique(user.id, dto.nomBoutique);
    }

    @Post('devenir-livreur')
    devenirLivreur(
        @CurrentUser() user: any,
        @Body() dto: DevenirLivreurDto,
    ){
        return this.authService.devenirLivreur(user.id, dto.numeroMobileMoney);
    }

    @Get('me')
    getMe(@CurrentUser() user: any) {
        return user;
    }
}
