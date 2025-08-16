/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Cloudflare Workers entry point
export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    // Create NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get configuration service
    const configService = app.get(ConfigService);

    // Enable CORS
    app.enableCors({
      origin: env.CORS_ORIGIN || 'https://your-frontend-domain.pages.dev',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Enable validation pipes
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // Set global prefix
    app.setGlobalPrefix('api');

    // Initialize the app
    await app.init();

    // Get the Express instance
    const expressApp = app.getHttpAdapter().getInstance();

    // Handle the request
    return new Promise((resolve) => {
      expressApp(request, {
        end: (body: string) => {
          resolve(
            new Response(body, {
              headers: {
                'Content-Type': 'application/json',
              },
            }),
          );
        },
        setHeader: () => {},
        status: () => ({ json: () => {} }),
      });
    });
  },
};
