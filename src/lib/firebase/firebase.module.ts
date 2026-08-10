import { Module, Global, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: () => {
        // Firebase is optional for local development. If credentials are not
        // configured, return null and let consumers fall back to a no-op.
        const projectId = process.env.FIREBASE_PROJECT_ID;
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!projectId || !clientEmail || !privateKey) {
          new Logger('FirebaseModule').warn(
            'Firebase credentials are not configured — FCM/Facebook auth will be a no-op.',
          );
          return null;
        }

        if (!admin.apps.length) {
          return admin.initializeApp({
            credential: admin.credential.cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        }
        return admin.apps[0]!;
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseModule {}