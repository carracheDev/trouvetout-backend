// src/firebase/firebase.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private app: admin.app.App;

  // Getter pour accéder à l'instance Firebase
  get firebaseApp(): admin.app.App {
    return this.app;
  }

  onModuleInit() {
    if (!admin.apps.length) {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
      console.log('✅ Firebase initialisé');
    }
  }

  async sendNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: data || {},
        android: {
          notification: {
            sound: 'default',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
          },
        },
        apns: {
          payload: {
            aps: { sound: 'default' },
          },
        },
      });
    } catch (error) {
      console.error('Erreur FCM:', error);
    }
  }

  async sendMulticast(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    if (!fcmTokens.length) return;
    try {
      await admin.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data: data || {},
      });
    } catch (error) {
      console.error('Erreur FCM multicast:', error);
    }
  }
}