
import { inject } from '@angular/core';

import {
  CanActivateFn,
  Router,
  Routes
} from '@angular/router';

import {
  AuthService
} from './services/auth.service';

// =====================================
// SCHOOL ID SCREENING GUARD
// =====================================

const screenedStudentGuard: CanActivateFn = async () => {

  const auth = inject(AuthService);

  const router = inject(Router);

  try {

    const user =
      await auth.getCurrentUser();

    if (!user) {

      return router.createUrlTree([
        '/auth'
      ]);

    }

    const screened =
      await auth.hasRecognizedSchoolId(
        user.id
      );

    return screened
      ? true
      : router.createUrlTree([
          '/auth'
        ]);

  } catch {

    return router.createUrlTree([
      '/auth'
    ]);

  }
};

// =====================================
// APP ROUTES
// =====================================

export const routes: Routes = [

  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'auth'
  },

  {
    path: 'auth',

    loadComponent: () =>
      import('./auth/auth-page')
        .then(m => m.AuthPage)
  },

  {
    path: 'register-scan',

    loadComponent: () =>
      import(
        './registration-scan/registration-scan-page'
      ).then(m => m.RegistrationScanPage)
  },

  {
    path: 'home',

    canActivate: [
      screenedStudentGuard
    ],

    loadComponent: () =>
      import('./home/home.page')
        .then(m => m.HomePage)
  },

  {
    path: 'profile',

    canActivate: [
      screenedStudentGuard
    ],

    loadComponent: () =>
      import('./profile/profile-page')
        .then(m => m.ProfilePage)
  },

  {
    path: 'report',

    canActivate: [
      screenedStudentGuard
    ],

    loadComponent: () =>
      import('./report/report-page')
        .then(m => m.ReportPage)
  },

  {
    path: 'messages',

    canActivate: [
      screenedStudentGuard
    ],

    loadComponent: () =>
      import('./messages/messages-page')
        .then(m => m.MessagesPage)
  },

  {
    path: 'messages/:conversationId',

    canActivate: [
      screenedStudentGuard
    ],

    loadComponent: () =>
      import('./messages/messages-page')
        .then(m => m.MessagesPage)
  },

  {
    path: 'claims',

    canActivate: [
      screenedStudentGuard
    ],

    loadComponent: () =>
      import('./claims/claim-center.page')
        .then(m => m.ClaimCenterPage)
  },

  {
    path: '**',
    redirectTo: 'auth'
  }

];
