// src/config/env.validation.ts
import { plainToClass } from 'class-transformer';
import { IsString, IsNotEmpty, validateSync } from 'class-validator';

export class EnvironmentVariables {
  // @IsString()
  // @IsNotEmpty({ message: 'INTEGRATION_COVERR_SECRET_KEY is required' })
  // INTEGRATION_COVERR_SECRET_KEY: string;

  // @IsString()
  // @IsNotEmpty({ message: 'INTEGRATION_UNSPLASH_SECRET_KEY is required' })
  // INTEGRATION_UNSPLASH_SECRET_KEY: string;

  // @IsString()
  // @IsNotEmpty({ message: 'SUPABASE_URL is required' })
  // SUPABASE_URL: string;

  // @IsString()
  // @IsNotEmpty({ message: 'SUPABASE_KEY is required' })
  // SUPABASE_KEY: string;

  // @IsString()
  // @IsNotEmpty({ message: 'SUPABASE_SERVICE_KEY is required' })
  // SUPABASE_SERVICE_KEY: string;

  // @IsString()
  // @IsNotEmpty({ message: 'MONGODB_URI is required' })
  // MONGODB_URI: string;

  // Add other environment variables as needed
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: true,
  });

  if (errors.length > 0) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Environment validation failed:');

    errors.forEach((error) => {
      if (error.constraints) {
        const messages = Object.values(error.constraints);
        messages.forEach((message) => {
          console.error('\x1b[31m%s\x1b[0m', `  - ${message}`);
        });
      } else {
        console.error(
          '\x1b[31m%s\x1b[0m',
          `  - Validation error for ${error.property}`,
        );
      }
    });

    console.error(
      '\x1b[31m%s\x1b[0m',
      'Server initialization aborted. Please check your .env file.',
    );

    throw new Error('Invalid environment configuration');
  }

  return validatedConfig;
}
