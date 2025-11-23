import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(private configService: ConfigService) {
        super({
            clientID: configService.get<string>('FACEBOOK_CLIENT_ID') as string,
            clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET') as string,
            callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL') as string,
            profileFields: ['id', 'emails', 'name', 'photos'],
        });
    }

    async validate(
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: Function,
    ): Promise<any> {
        const { name, emails, photos } = profile;
        const user = {
            facebookId: profile.id,
            email: emails ? emails[0].value : profile.id + '@facebook.com',
            firstName: name?.givenName,
            lastName: name?.familyName,
            picture: photos?.[0]?.value,
            accessToken,
        };
        done(null, user);
    }
}
